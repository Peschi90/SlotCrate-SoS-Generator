import { NextResponse } from "next/server";
import { createCsrfToken, setCsrfCookie } from "@/lib/csrf";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(): Promise<NextResponse> {
  const { token, nonce } = createCsrfToken();
  const response = NextResponse.json({ csrfToken: token });
  setCsrfCookie(nonce);
  return response;
}