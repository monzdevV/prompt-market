import { NextResponse } from "next/server";
import { log } from "@/lib/log";
import { APP_URL } from "@/lib/platforms/common";
import { syncRelayedAccounts, uploadPostEnabled } from "@/lib/platforms/uploadpost";
import { getSession } from "@/lib/session";
import { requestSync } from "@/lib/sync";

/**
 * Vuelta desde la página de conexión de Upload-Post (y botón «Actualizar» de Cuentas): trae las redes
 * conectadas allí. Solo lee de Upload-Post y deja nuestras cuentas igual que las suyas.
 */
export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.redirect(new URL("/entrar", APP_URL()));
  if (!uploadPostEnabled()) return NextResponse.redirect(new URL("/cuentas?error=unavailable&red=uploadpost", APP_URL()));
  try {
    const { ids, overLimit } = await syncRelayedAccounts(session.workspaceId);
    if (ids.length) requestSync(session.workspaceId, ids);
    if (!ids.length) return NextResponse.redirect(new URL(`/cuentas?error=${overLimit ? "plan_limit" : "no_accounts"}&red=uploadpost`, APP_URL()));
    return NextResponse.redirect(
      new URL(`/cuentas?ok=connected&red=uploadpost&n=${ids.length}${overLimit ? `&fuera=${overLimit}` : ""}`, APP_URL()),
    );
  } catch (e) {
    log.warn("uploadpost.return_failed", { workspaceId: session.workspaceId, err: e });
    return NextResponse.redirect(new URL("/cuentas?error=failed&red=uploadpost", APP_URL()));
  }
}
