import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { deleteSession } from "@/lib/auth";
import { sessionCookieName } from "@/lib/session";

export async function POST(request: Request) {
  const store = await cookies();
  deleteSession(store.get(sessionCookieName())?.value);
  const res = NextResponse.redirect(new URL("/entrar", request.url), 303);
  res.cookies.delete(sessionCookieName());
  return res;
}
