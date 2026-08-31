"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import type { Prisma } from "@/generated/prisma/client";
import { CustomFieldEntity, CustomFieldType } from "@/generated/prisma/enums";
import { getPrisma } from "@/lib/prisma";
import { listCustomFieldDefinitions } from "@/lib/queries/custom-fields";
import { slugify } from "@/lib/slugify";

const ENTITY_PATH: Record<CustomFieldEntity, string> = {
  COMPANY: "/companies",
  CONTACT: "/contacts",
  VEHICLE: "/vehicles",
  DEAL: "/deals",
};

const TABLE_BY_ENTITY: Record<CustomFieldEntity, string> = {
  COMPANY: "companies",
  CONTACT: "contacts",
  VEHICLE: "vehicles",
  DEAL: "deals",
};

export async function getCustomFieldDefinitionsAction(entity: CustomFieldEntity) {
  return listCustomFieldDefinitions(entity);
}

const createCustomFieldSchema = z.object({
  label: z.string().trim().min(1, "Le libellé est requis."),
  key: z.string().trim().min(1, "La clé est requise."),
  entity: z.enum(CustomFieldEntity),
  fieldType: z.enum(CustomFieldType),
  required: z.boolean().default(false),
  options: z.array(z.string().trim().min(1)).optional(),
});

export type CreateCustomFieldInput = z.infer<typeof createCustomFieldSchema>;

export async function createCustomFieldAction(input: CreateCustomFieldInput) {
  const parsed = createCustomFieldSchema.parse(input);
  const prisma = getPrisma();
  const key = slugify(parsed.key || parsed.label);
  if (!key) {
    throw new Error("Impossible de générer une clé à partir de ce libellé.");
  }

  try {
    const definition = await prisma.customFieldDefinition.create({
      data: {
        label: parsed.label,
        key,
        entity: parsed.entity,
        fieldType: parsed.fieldType,
        required: parsed.required,
        options:
          parsed.fieldType === "SELECT" && parsed.options?.length
            ? parsed.options
            : undefined,
      },
    });
    revalidatePath("/settings");
    revalidatePath(ENTITY_PATH[parsed.entity]);
    return definition.id;
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "P2002") {
      throw new Error(`La clé "${key}" existe déjà pour cette entité.`);
    }
    throw error;
  }
}

export async function toggleCustomFieldActiveAction(id: string, isActive: boolean) {
  const prisma = getPrisma();
  const definition = await prisma.customFieldDefinition.update({
    where: { id },
    data: { isActive },
  });
  revalidatePath("/settings");
  revalidatePath(ENTITY_PATH[definition.entity]);
}

/**
 * Deletes a field definition and strips its now-orphaned key from every
 * row's `customFields` JSON blob for that entity, so stale data can't
 * resurface if a field with the same key is ever recreated.
 */
export async function deleteCustomFieldAction(id: string) {
  const prisma = getPrisma();
  const definition = await prisma.customFieldDefinition.delete({ where: { id } });

  const table = TABLE_BY_ENTITY[definition.entity];
  await prisma.$executeRawUnsafe(
    `UPDATE "${table}" SET "customFields" = "customFields" - $1 WHERE "customFields" ? $1`,
    definition.key
  );

  revalidatePath("/settings");
  revalidatePath(ENTITY_PATH[definition.entity]);
}

function mergeCustomFields(
  current: unknown,
  key: string,
  value: unknown
): Prisma.InputJsonValue {
  const base =
    current && typeof current === "object" ? (current as Record<string, unknown>) : {};
  return { ...base, [key]: value } as Prisma.InputJsonValue;
}

/** Saves a single custom field value on one entity row — called per-field
 * (Attio-style inline auto-save) rather than through a big form submit. */
export async function updateCustomFieldValueAction(
  entity: CustomFieldEntity,
  entityId: string,
  key: string,
  value: unknown
) {
  const prisma = getPrisma();

  switch (entity) {
    case "COMPANY": {
      const row = await prisma.company.findUniqueOrThrow({
        where: { id: entityId },
        select: { customFields: true },
      });
      await prisma.company.update({
        where: { id: entityId },
        data: { customFields: mergeCustomFields(row.customFields, key, value) },
      });
      break;
    }
    case "CONTACT": {
      const row = await prisma.contact.findUniqueOrThrow({
        where: { id: entityId },
        select: { customFields: true },
      });
      await prisma.contact.update({
        where: { id: entityId },
        data: { customFields: mergeCustomFields(row.customFields, key, value) },
      });
      break;
    }
    case "VEHICLE": {
      const row = await prisma.vehicle.findUniqueOrThrow({
        where: { id: entityId },
        select: { customFields: true },
      });
      await prisma.vehicle.update({
        where: { id: entityId },
        data: { customFields: mergeCustomFields(row.customFields, key, value) },
      });
      break;
    }
    case "DEAL": {
      const row = await prisma.deal.findUniqueOrThrow({
        where: { id: entityId },
        select: { customFields: true },
      });
      await prisma.deal.update({
        where: { id: entityId },
        data: { customFields: mergeCustomFields(row.customFields, key, value) },
      });
      break;
    }
  }

  revalidatePath(ENTITY_PATH[entity]);
}
