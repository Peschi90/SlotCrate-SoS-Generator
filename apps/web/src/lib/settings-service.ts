import { prisma } from "./db";
import {
  DEFAULT_GENERATOR_SETTINGS,
  parseGeneratorSettingsPayload,
  generatorSettingsPayloadSchema,
  type GeneratorSettingsPayload
} from "./generator-settings-schema";

/**
 * Liefert die aktuell aktive Version. Falls noch keine existiert (frisch
 * migrierte DB), wird die Default-Version transaktional angelegt.
 */
export async function getActiveSettings(): Promise<{
  version: number;
  createdAt: Date;
  payload: GeneratorSettingsPayload;
}> {
  const current = await prisma.generatorSettings.findUnique({
    where: { singleton: true },
    include: { activeVersion: true }
  });
  if (current) {
    return {
      version: current.activeVersion.id,
      createdAt: current.activeVersion.createdAt,
      payload: parseGeneratorSettingsPayload(current.activeVersion.payload)
    };
  }
  return await prisma.$transaction(async (tx) => {
    const created = await tx.generatorSettingsVersion.create({
      data: {
        note: "initial",
        payload: DEFAULT_GENERATOR_SETTINGS as unknown as object
      }
    });
    await tx.generatorSettings.create({
      data: { singleton: true, activeVersionId: created.id }
    });
    return {
      version: created.id,
      createdAt: created.createdAt,
      payload: DEFAULT_GENERATOR_SETTINGS
    };
  });
}

/**
 * Erzeugt eine neue Version aus einem vollständig validierten Payload und
 * setzt sie sofort als aktive Version. Frühere Versionen und die daran
 * gebundenen SavedConfiguration-Datensätze bleiben unangetastet.
 */
export async function publishNewSettingsVersion(
  actorId: string,
  payload: GeneratorSettingsPayload,
  note?: string
): Promise<{ version: number }> {
  const parsed = generatorSettingsPayloadSchema.parse(payload);
  return await prisma.$transaction(async (tx) => {
    const created = await tx.generatorSettingsVersion.create({
      data: {
        note: note?.slice(0, 255),
        createdById: actorId,
        payload: parsed as unknown as object
      }
    });
    await tx.generatorSettings.upsert({
      where: { singleton: true },
      update: { activeVersionId: created.id },
      create: { singleton: true, activeVersionId: created.id }
    });
    await tx.adminAuditLog.create({
      data: {
        actorId,
        action: "settings.publish",
        targetType: "GeneratorSettingsVersion",
        targetId: String(created.id),
        details: { note: note ?? null }
      }
    });
    return { version: created.id };
  });
}

export async function getSettingsVersionOrThrow(id: number): Promise<GeneratorSettingsPayload> {
  const row = await prisma.generatorSettingsVersion.findUnique({ where: { id } });
  if (!row) throw new Error(`GeneratorSettingsVersion ${id} nicht gefunden`);
  return parseGeneratorSettingsPayload(row.payload);
}
