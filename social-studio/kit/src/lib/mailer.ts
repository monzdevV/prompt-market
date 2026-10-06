import { log } from "./log";

/**
 * Envío de emails transaccionales (verificación, recuperación, invitaciones).
 *  - Con RESEND_API_KEY + MAIL_FROM: se envían por la API HTTP de Resend (resend.com/docs/api-reference/emails/send-email).
 *  - Sin configurar (desarrollo/local): el enlace se escribe en el log del servidor para poder probar el flujo.
 */
export async function sendMail(msg: { to: string; subject: string; text: string }) {
  // Cuentas creadas con TikTok (sin email): dirección .invalid, nunca se envía nada
  if (msg.to.endsWith(".invalid")) return;
  const key = process.env.RESEND_API_KEY;
  const from = process.env.MAIL_FROM;
  if (!key || !from) {
    // Solo en desarrollo se escribe el contenido (con el enlace) en el log; en producción sería una fuga
    if (process.env.NODE_ENV !== "production" || process.env.MAIL_LOG === "true") {
      // A propósito fuera del logger (que oculta los enlaces con token): así se puede probar el flujo en local
      if (process.env.NODE_ENV !== "test") console.log(`
[email sin enviar] Para: ${msg.to}
Asunto: ${msg.subject}
${msg.text}
`);
    }
    else log.warn("mail.not_configured", { subject: msg.subject });
    return { sent: false };
  }
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from, to: [msg.to], subject: msg.subject, text: msg.text }),
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) {
    log.error("mail.failed", { to: msg.to, status: res.status });
    throw new Error("No se pudo enviar el email");
  }
  return { sent: true };
}
