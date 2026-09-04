/**
 * Seed-Skript für Admin-Bootstrap. Nur einmalig ausführen.
 * Erfordert ADMIN_BOOTSTRAP_EMAIL + ADMIN_BOOTSTRAP_PASSWORD in der Umgebung.
 */
import { PrismaClient } from "@prisma/client";
import { hash } from "@node-rs/argon2";
import { DEFAULT_GENERATOR_SETTINGS } from "../src/lib/generator-settings-schema.ts";

const prisma = new PrismaClient();

async function main(): Promise<void> {
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
