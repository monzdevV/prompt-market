import { log } from "@/lib/log";
import { deleteMetaUserData, parseSignedRequest } from "@/lib/meta-deletion";
import { APP_URL } from "@/lib/platforms/common";

/** Callback de eliminación de datos que Meta llama cuando un usuario quita la app o pide borrar sus datos. */
export async function POST(request: Request) {
  const secret = process.env.META_APP_SECRET;
  if (!secret) return Response.json({ error: "No configurado" }, { status: 503 });
  let signed: string | null = null;
  try {
    signed = (await request.formData()).get("signed_request")?.toString() ?? null;
  } catch {
    // Cuerpo no válido
  }
  const data = signed ? parseSignedRequest(signed, secret) : null;
  if (!data?.user_id) return Response.json({ error: "signed_request no válido" }, { status: 400 });
  const { code, accounts } = deleteMetaUserData(String(data.user_id));
  log.info("meta.data_deletion", { accounts });
  return Response.json({ url: `${APP_URL()}/eliminar-datos/estado?codigo=${encodeURIComponent(code)}`, confirmation_code: code });
}
