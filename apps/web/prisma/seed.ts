/**
 * Seed-Skript für Admin-Bootstrap. Nur einmalig ausführen.
 * Erfordert ADMIN_BOOTSTRAP_EMAIL + ADMIN_BOOTSTRAP_PASSWORD in der Umgebung.
 */
import { dirname, resolve } from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { PrismaClient } from "@prisma/client";
import { hash } from "@node-rs/argon2";

const require = createRequire(import.meta.url);
const { loadEnvConfig } = require("@next/env") as {
  loadEnvConfig: (dir: string, dev?: boolean) => void;
};

const scriptDir = dirname(fileURLToPath(import.meta.url));
const webRoot = resolve(scriptDir, "..");
const repoRoot = resolve(scriptDir, "../..");

// Seed kann direkt in apps/web oder vom Repo-Root via --prefix gestartet werden.
// Deshalb laden wir erst apps/web/.env und nutzen dann Root-.env als Fallback.
loadEnvConfig(webRoot, false);
if (!process.env.ADMIN_BOOTSTRAP_EMAIL || !process.env.ADMIN_BOOTSTRAP_PASSWORD) {
  loadEnvConfig(repoRoot, false);
}

const prisma = new PrismaClient();

async function main(): Promise<void> {
  const { DEFAULT_GENERATOR_SETTINGS } = (await import(
    new URL("../src/lib/generator-settings-schema.ts", import.meta.url).href
  )) as {
    DEFAULT_GENERATOR_SETTINGS: unknown;
  };

  const email = process.env.ADMIN_BOOTSTRAP_EMAIL;
  const password = process.env.ADMIN_BOOTSTRAP_PASSWORD;
  if (!email || !password) {
    console.log("kein ADMIN_BOOTSTRAP_EMAIL/PASSWORD → überspringe Admin-Seed");
    return;
  }
  if (password.length < 12) throw new Error("Bootstrap-Passwort muss ≥ 12 Zeichen haben");

  const version = await prisma.generatorSettingsVersion.upsert({
    where: { id: 1 },
    update: {},
    create: { id: 1, note: "initial", payload: DEFAULT_GENERATOR_SETTINGS as unknown as object }
  });
  await prisma.generatorSettings.upsert({
    where: { singleton: true },
    update: {},
    create: { singleton: true, activeVersionId: version.id }
  });

  const passwordHash = await hash(password, { memoryCost: 65536, timeCost: 3, parallelism: 1 });
  await prisma.user.upsert({
    where: { email },
    update: { role: "ADMIN" },
    create: { email, passwordHash, role: "ADMIN" }
  });
  console.log(`Admin ${email} bereit.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
