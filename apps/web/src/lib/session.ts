import { randomBytes, createHash, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { prisma } from "./db";
import type { UserRole } from "@prisma/client";

const SESSION_COOKIE = "slotcrate_session";
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 7; // 7 Tage

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export interface AuthenticatedUser {
  id: string;
  email: string;
  role: UserRole;
}

export async function createSession(userId: string, opts: { userAgent?: string | null; ipHash?: string | null } = {}): Promise<string> {
  const token = randomBytes(32).toString("hex");
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
  await prisma.session.create({
    data: {
      id: tokenHash,
      userId,
      expiresAt,
      userAgent: opts.userAgent?.slice(0, 255) ?? null,
      ipHash: opts.ipHash ?? null
    }
  });
  cookies().set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_TTL_MS / 1000
  });
  return token;
}

export async function destroyCurrentSession(): Promise<void> {
  const token = cookies().get(SESSION_COOKIE)?.value;
  if (token) {
    const tokenHash = hashToken(token);
    await prisma.session.deleteMany({ where: { id: tokenHash } });
  }
  cookies().delete(SESSION_COOKIE);
}

export async function getCurrentUser(): Promise<AuthenticatedUser | null> {
  const token = cookies().get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const tokenHash = hashToken(token);
  const now = new Date();
  const session = await prisma.session.findUnique({
    where: { id: tokenHash },
    include: { user: true }
  });
  if (!session) return null;
  if (session.expiresAt < now) {
    await prisma.session.delete({ where: { id: tokenHash } }).catch(() => undefined);
    return null;
  }
  // Sliding-Session, aber nur alle 5 Minuten schreiben, um DB-Last zu sparen.
  if (now.getTime() - session.lastSeenAt.getTime() > 5 * 60 * 1000) {
    await prisma.session
      .update({ where: { id: tokenHash }, data: { lastSeenAt: now } })
      .catch(() => undefined);
  }
  return { id: session.user.id, email: session.user.email, role: session.user.role };
}

export async function requireAdmin(): Promise<AuthenticatedUser> {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") {
    const err = new Error("forbidden");
    (err as Error & { status: number }).status = 403;
    throw err;
  }
  return user;
}

export function sessionCookieName(): string {
  return SESSION_COOKIE;
}

export function tokensEqual(a: string, b: string): boolean {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ba.length !== bb.length) return false;
  return timingSafeEqual(ba, bb);
}
