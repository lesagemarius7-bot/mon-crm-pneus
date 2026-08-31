import "server-only";

import type { CustomFieldEntity } from "@/generated/prisma/enums";
import { getPrisma } from "@/lib/prisma";

export async function listCustomFieldDefinitions(entity?: CustomFieldEntity) {
  const prisma = getPrisma();
  return prisma.customFieldDefinition.findMany({
    where: entity ? { entity } : undefined,
    orderBy: [{ order: "asc" }, { createdAt: "asc" }],
  });
}

export type CustomFieldDefinitionRow = Awaited<
  ReturnType<typeof listCustomFieldDefinitions>
>[number];
