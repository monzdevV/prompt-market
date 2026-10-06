import Link from "next/link";
import { tiktokAudited } from "@/lib/features";
import { connectorStatus } from "@/lib/platforms";

const ERRORS: Record<string, string> = {
  social_denied: "No se completó el inicio de sesión con la red. Vuelve a intentarlo.",
  social_failed: "No pudimos entrar con esa cuenta. Vuelve a intentarlo en unos minutos.",
  social_invite: "De momento el registro es solo con invitación.",
  social_unavailable: "Ese inicio de sesión aún no está disponible.",
  social_rate: "Demasiados intentos seguidos. Espera unos minutos.",
};

/**
 * Botones «Continuar con Google (YouTube)» y «Continuar con TikTok». Son enlaces normales (GET): el
 * servidor redirige a la red. Solo aparecen las redes configuradas en el servidor.
 */
export function SocialButtons({ next, error }: { next?: string; error?: string }) {
  const status = new Map(connectorStatus().map((c) => [c.id, c.configured]));
  const q = next ? `?next=${encodeURIComponent(next)}` : "";
  const google = status.get("youtube");
  // TikTok: solo cuando haya aprobado la app (antes solo entrarían cuentas de prueba)
  const tiktok = status.get("tiktok") && tiktokAudited();
  if (!google && !tiktok) return null;
  const message = error ? ERRORS[error] : null;
  return (
    <div className="space-y-3">
      {message && (
        <p role="alert" className="rounded-lg bg-bad-soft p-2.5 text-sm text-bad">
          {message}
        </p>
      )}
      {google && (
        <a href={`/api/auth/social/google${q}`} className="btn-ghost w-full justify-center">
          <span aria-hidden className="grid h-5 w-5 place-items-center rounded bg-[#ff0000] text-[10px] font-bold text-white">
            ▶
          </span>
          Continuar con Google (YouTube)
        </a>
      )}
      {tiktok && (
        <a href={`/api/auth/social/tiktok${q}`} className="btn-ghost w-full justify-center">
          <span aria-hidden className="grid h-5 w-5 place-items-center rounded bg-black text-[10px] font-bold text-white">
            ♪
          </span>
          Continuar con TikTok
        </a>
      )}
      <p className="text-center text-xs text-muted">
        Al continuar confirmas que tienes al menos 14 años y aceptas los{" "}
        <Link href="/terminos" target="_blank" className="underline">
          términos
        </Link>{" "}
        y la{" "}
        <Link href="/privacidad" target="_blank" className="underline">
          política de privacidad
        </Link>
        . Tu cuenta de la red queda conectada para publicar.
      </p>
      <div className="flex items-center gap-3 text-xs text-muted">
        <span className="h-px flex-1 bg-line" /> o con tu email <span className="h-px flex-1 bg-line" />
      </div>
    </div>
  );
}
