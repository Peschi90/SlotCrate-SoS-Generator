import { hash, verify } from "@node-rs/argon2";
import { prisma } from "./db";

const ARGON_OPTS = { memoryCost: 65536, timeCost: 3, parallelism: 1 };

export async function hashPassword(plain: string): Promise<string> {
  return hash(plain, ARGON_OPTS);
}

export async function verifyPassword(plain: string, phc: string): Promise<boolean> {
  try {
    return await verify(phc, plain);
  } catch {
    return false;
  }
}

export async function authenticate(email: string, password: string): Promise<{ id: string; role: "USER" | "ADMIN" } | null> {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    // Fake work, um Timing-Angriffe zu erschweren.
    await verifyPassword(password, "$argon2id$v=19$m=65536,t=3,p=1$c2FsdA$aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa");
    return null;
  }
  const ok = await verifyPassword(password, user.passwordHash);
  if (!ok) return null;
  return { id: user.id, role: user.role };
}
