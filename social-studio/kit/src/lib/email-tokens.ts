import { db, tx } from "./db";
import { hashPassword, randomToken, sha256 } from "./crypto";
import { badRequest } from "./errors";
import { sendMail } from "./mailer";
import { APP_URL } from "./platforms/common";
import { clearRateLimit } from "./rate-limit";

/** Tokens de un solo uso enviados por email (verificar dirección, restablecer contraseña). Solo se guarda su hash. */
const TTL = { verify: 7 * 24 * 3600_000, reset: 60 * 60_000 } as const;
type Purpose = keyof typeof TTL;

function issue(userId: string, purpose: Purpose) {
  const token = randomToken();
  const now = Date.now();
  // Un token nuevo invalida los anteriores del mismo tipo
  db.prepare("UPDATE email_tokens SET used_at = ? WHERE user_id = ? AND purpose = ? AND used_at IS NULL").run(now, userId, purpose);
  db.prepare("INSERT INTO email_tokens (token_hash, user_id, purpose, expires_at, created_at) VALUES (?, ?, ?, ?, ?)").run(
    sha256(token),
    userId,
    purpose,
    now + TTL[purpose],
    now,
  );
  return token;
}

function consume(token: string, purpose: Purpose) {
  return tx(() => {
    const row = db
      .prepare("SELECT user_id FROM email_tokens WHERE token_hash = ? AND purpose = ? AND used_at IS NULL AND expires_at > ?")
      .get(sha256(token), purpose, Date.now()) as { user_id: string } | undefined;
    if (!row) return null;
    db.prepare("UPDATE email_tokens SET used_at = ? WHERE token_hash = ?").run(Date.now(), sha256(token));
    return row.user_id;
  });
}

export async function sendVerificationEmail(userId: string, email: string) {
  const token = issue(userId, "verify");
  await sendMail({
    to: email,
    subject: "Confirma tu email en Manny",
    text: `Hola:\n\nConfirma tu email abriendo este enlace (caduca en 7 días):\n${APP_URL()}/verificar?token=${token}\n\nSi no te has registrado, ignora este mensaje.`,
  });
}

export function verifyEmail(token: string) {
  const userId = consume(token, "verify");
  if (!userId) return false;
  db.prepare("UPDATE users SET email_verified_at = COALESCE(email_verified_at, ?) WHERE id = ?").run(Date.now(), userId);
  return true;
}

/** Siempre responde igual exista o no el email (no revela qué emails están registrados). */
export async function sendPasswordReset(email: string) {
  const user = db.prepare("SELECT id, email FROM users WHERE email = ?").get(email.trim().toLowerCase()) as
    | { id: string; email: string }
    | undefined;
  if (!user) return;
  const token = issue(user.id, "reset");
  await sendMail({
    to: user.email,
    subject: "Restablece tu contraseña de Manny",
    text: `Hola:\n\nPara elegir una contraseña nueva abre este enlace (caduca en 1 hora):\n${APP_URL()}/restablecer?token=${token}\n\nSi no lo has pedido tú, ignora este mensaje: tu contraseña no cambia.`,
  });
}

/** Cambia la contraseña y cierra todas las sesiones abiertas de ese usuario. */
export async function resetPassword(token: string, newPassword: string) {
  const hash = await hashPassword(newPassword);
  const userId = consume(token, "reset");
  if (!userId) throw badRequest("El enlace ha caducado o ya se usó. Pide uno nuevo.");
  tx(() => {
    const { email } = db.prepare("SELECT email FROM users WHERE id = ?").get(userId) as { email: string };
    // Quien bloqueó la cuenta a base de fallos (tope global por email) no deja al dueño fuera tras restablecer
    clearRateLimit(`login-email:${email}`);
    db.prepare("UPDATE users SET password_hash = ?, email_verified_at = COALESCE(email_verified_at, ?) WHERE id = ?").run(hash, Date.now(), userId);
    db.prepare("DELETE FROM sessions WHERE user_id = ?").run(userId);
  });
  return userId;
}

export function isEmailVerified(userId: string) {
  return !!(db.prepare("SELECT email_verified_at FROM users WHERE id = ?").get(userId) as { email_verified_at: number | null } | undefined)
    ?.email_verified_at;
}
