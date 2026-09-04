import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

const CSRF_COOKIE = "slotcrate_csrf";

function secret(): string {
  const s = process.env.CSRF_SECRET ?? process.env.SESSION_SECRET;
  if (s && s.length >= 24) return s;
  if (process.env.NODE_ENV !== "production") {
    return "slotcrate-dev-csrf-secret-slotcrate-dev-csrf-secret";
  }
  throw new Error("CSRF_SECRET fehlt oder zu kurz");
}

function sign(nonce: string): string {
  return createHmac("sha256", secret()).update(nonce).digest("hex");
}

export function createCsrfToken(): { token: string; nonce: string } {
  const nonce = randomBytes(16).toString("hex");
  const signature = sign(nonce);
  return { token: `${nonce}.${signature}`, nonce };
}

export function setCsrfCookie(nonce: string): void {
  cookies().set(CSRF_COOKIE, nonce, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 4
  });
}

/** Prüft einen im Header/Body übermittelten Token gegen den Cookie-Nonce. */
export function verifyCsrfToken(submitted: string | null | undefined): boolean {
  if (!submitted) return false;
  const [nonce, signature] = submitted.split(".");
  if (!nonce || !signature) return false;
  const cookieNonce = cookies().get(CSRF_COOKIE)?.value;
  if (!cookieNonce) return false;
  const expected = sign(nonce);
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  if (!timingSafeEqual(a, b)) return false;
  return nonce === cookieNonce;
}
