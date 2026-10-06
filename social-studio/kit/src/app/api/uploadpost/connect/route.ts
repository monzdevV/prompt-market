import { NextResponse } from "next/server";
import { log } from "@/lib/log";
import { APP_URL } from "@/lib/platforms/common";
import { connectUrl, uploadPostEnabled } from "@/lib/platforms/uploadpost";
import { getSession } from "@/lib/session";

/** Lleva al cliente a la página de conexión de Upload-Post (con el logo de Manny y en español). */
export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.redirect(new URL("/entrar", APP_URL()));
  if (!uploadPostEnabled()) return NextResponse.redirect(new URL("/cuentas?error=unavailable&red=uploadpost", APP_URL()));
  try {
    return NextResponse.redirect(await connectUrl(session.workspaceId));
  } catch (e) {
    log.warn("uploadpost.connect_failed", { workspaceId: session.workspaceId, err: e });
    const code = e instanceof Error && "code" in e && e.code === "plan_limit" ? "relay_full" : "failed";
    return NextResponse.redirect(new URL(`/cuentas?error=${code}&red=uploadpost`, APP_URL()));
  }
}
