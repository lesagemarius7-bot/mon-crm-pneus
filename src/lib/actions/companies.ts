"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import type { Prisma } from "@/generated/prisma/client";
import { CompanyStatus, CompanyType } from "@/generated/prisma/enums";
import { getCurrentUserId } from "@/lib/auth";
import { parseOptionalInt, parseOptionalNumber, resolveEnumValue } from "@/lib/csv-import-utils";
import { COMPANY_STATUS_LABELS, COMPANY_TYPE_LABELS } from "@/lib/labels";
import { notifyAssignment } from "@/lib/notifications";
import { getPrisma } from "@/lib/prisma";
import { getCompanyDetail, getCompanyMergeCandidate } from "@/lib/queries/companies";
import type { ImportResult } from "@/components/import/import-csv-dialog";

export async function getCompanyDetailAction(id: string) {
  return getCompanyDetail(id);
}

export async function getCompanyMergeCandidateAction(id: string) {
  return getCompanyMergeCandidate(id);
}

const companySchema = z.object({
  name: z.string().trim().min(1, "Le nom est requis."),
  siret: z.string().trim().nullable().optional(),
  type: z.enum(CompanyType),
  status: z.enum(CompanyStatus),
  fleetSize: z.number().int().min(0).nullable().optional(),
  estimatedRevenue: z.number().min(0).nullable().optional(),
  assignedToId: z.string().min(1).nullable().optional(),
  // Set by the "Nouvelle entreprise" dialog's Sirene enrichment search —
  // only present when a suggestion was picked, so writes stay conditional
  // below rather than nulling these out whenever a caller omits them.
  address: z.string().trim().nullable().optional(),
  city: z.string().trim().nullable().optional(),
  postalCode: z.string().trim().nullable().optional(),
  sector: z.string().trim().nullable().optional(),
  employeeRange: z.string().trim().nullable().optional(),
  linkedin: z.string().trim().nullable().optional(),
});

export type CompanyFormInput = z.infer<typeof companySchema>;

export async function createCompanyAction(input: CompanyFormInput) {
  const parsed = companySchema.parse(input);
  const prisma = getPrisma();
  const actorId = await getCurrentUserId();

  const company = await prisma.company.create({
    data: {
      name: parsed.name,
      siret: parsed.siret || null,
      type: parsed.type,
      status: parsed.status,
      fleetSize: parsed.fleetSize ?? null,
      estimatedRevenue: parsed.estimatedRevenue ?? null,
      assignedToId: parsed.assignedToId || null,
      ...(parsed.address !== undefined ? { address: parsed.address } : {}),
      ...(parsed.city !== undefined ? { city: parsed.city } : {}),
      ...(parsed.postalCode !== undefined ? { postalCode: parsed.postalCode } : {}),
      ...(parsed.sector !== undefined ? { sector: parsed.sector } : {}),
      ...(parsed.employeeRange !== undefined ? { employeeRange: parsed.employeeRange } : {}),
      ...(parsed.linkedin !== undefined ? { linkedin: parsed.linkedin } : {}),
    },
  });

  await notifyAssignment({
    recipientId: parsed.assignedToId,
    actorId,
    type: "COMPANY_ASSIGNED",
    entityLabel: `l'entreprise « ${company.name} »`,
    link: `/companies?id=${company.id}`,
  });

  revalidatePath("/companies");
  return company.id;
}

export async function updateCompanyAction(id: string, input: CompanyFormInput) {
  const parsed = companySchema.parse(input);
  const prisma = getPrisma();
  const actorId = await getCurrentUserId();

  const company = await prisma.company.update({
    where: { id },
    data: {
      name: parsed.name,
      siret: parsed.siret || null,
      type: parsed.type,
      status: parsed.status,
      fleetSize: parsed.fleetSize ?? null,
      estimatedRevenue: parsed.estimatedRevenue ?? null,
      assignedToId: parsed.assignedToId || null,
    },
  });

  await notifyAssignment({
    recipientId: parsed.assignedToId,
    actorId,
    type: "COMPANY_ASSIGNED",
    entityLabel: `l'entreprise « ${company.name} »`,
    link: `/companies?id=${company.id}`,
  });

  revalidatePath("/companies");
  revalidatePath("/deals");
  return id;
}

const companyDetailsSchema = z.object({
  name: z.string().trim().min(1, "Le nom est requis.").optional(),
  type: z.enum(CompanyType).optional(),
  status: z.enum(CompanyStatus).optional(),
  city: z.string().trim().nullable().optional(),
  fleetSize: z.number().int().min(0).nullable().optional(),
  estimatedRevenue: z.number().min(0).nullable().optional(),
  siret: z.string().trim().nullable().optional(),
  website: z.string().trim().nullable().optional(),
  linkedin: z.string().trim().nullable().optional(),
  sector: z.string().trim().nullable().optional(),
  employeeRange: z.string().trim().nullable().optional(),
  assignedToId: z.string().min(1).nullable().optional(),
});

export type CompanyDetailsInput = z.infer<typeof companyDetailsSchema>;

/**
 * Single-field (or small-patch) update used by the inline-editable fields
 * in the Company drawer's left column — unlike updateCompanyAction, callers
 * only send the field(s) that actually changed.
 */
export async function updateCompanyDetailsAction(
  id: string,
  input: CompanyDetailsInput
) {
  const parsed = companyDetailsSchema.parse(input);
  const prisma = getPrisma();

  const company = await prisma.company.update({ where: { id }, data: parsed });

  if (parsed.assignedToId !== undefined) {
    const actorId = await getCurrentUserId();
    await notifyAssignment({
      recipientId: parsed.assignedToId,
      actorId,
      type: "COMPANY_ASSIGNED",
      entityLabel: `l'entreprise « ${company.name} »`,
      link: `/companies?id=${company.id}`,
    });
  }

  revalidatePath("/companies");
  revalidatePath("/deals");
  return id;
}

/**
 * Bulk-imports companies from a mapped CSV (see ImportCsvDialog). Rows
 * missing a name are rejected individually; type/status fall back to
 * defaults rather than failing the row, since they're convenience fields.
 * Valid rows are inserted in one batch via createMany (skipDuplicates
 * handles SIRET collisions).
 */
export async function importCompaniesAction(
  rows: Record<string, string>[]
): Promise<ImportResult> {
  const prisma = getPrisma();
  const errors: ImportResult["errors"] = [];
  const validRows: {
    name: string;
    siret: string | null;
    type: CompanyType;
    status: CompanyStatus;
    fleetSize: number | null;
    estimatedRevenue: number | null;
  }[] = [];

  rows.forEach((row, index) => {
    const lineNumber = index + 2; // +1 for 0-index, +1 for the header row
    const name = (row.name ?? "").trim();
    if (!name) {
      errors.push({ row: lineNumber, message: "Nom manquant." });
      return;
    }

    validRows.push({
      name,
      siret: row.siret?.trim() || null,
      type: resolveEnumValue(row.type ?? "", CompanyType, COMPANY_TYPE_LABELS, "AUTRE"),
      status: resolveEnumValue(
        row.status ?? "",
        CompanyStatus,
        COMPANY_STATUS_LABELS,
        "PROSPECT"
      ),
      fleetSize: parseOptionalInt(row.fleetSize ?? ""),
      estimatedRevenue: parseOptionalNumber(row.estimatedRevenue ?? ""),
    });
  });

  const result =
    validRows.length > 0
      ? await prisma.company.createMany({ data: validRows, skipDuplicates: true })
      : { count: 0 };

  revalidatePath("/companies");
  return { successCount: result.count, errors };
}

/**
 * Bulk-deletes companies. Cascade behavior is already enforced at the DB
 * level by the schema's onDelete rules: vehicles, deals, notes and
 * activities of the deleted companies are removed with them, while
 * contacts are kept and simply unlinked (companyId set to null).
 */
export async function deleteCompaniesAction(ids: string[]) {
  const prisma = getPrisma();
  const result = await prisma.company.deleteMany({ where: { id: { in: ids } } });

  revalidatePath("/companies");
  revalidatePath("/contacts");
  revalidatePath("/vehicles");
  revalidatePath("/deals");
  return result.count;
}

const mergeCompaniesSchema = z.object({
  keepId: z.string().min(1),
  removeId: z.string().min(1),
  fields: z.object({
    name: z.string().trim().min(1, "Le nom est requis."),
    siret: z.string().trim().nullable(),
    type: z.enum(CompanyType),
    status: z.enum(CompanyStatus),
    address: z.string().trim().nullable(),
    city: z.string().trim().nullable(),
    postalCode: z.string().trim().nullable(),
    sector: z.string().trim().nullable(),
    employeeRange: z.string().trim().nullable(),
    fleetSize: z.number().int().min(0).nullable(),
    estimatedRevenue: z.number().min(0).nullable(),
    website: z.string().trim().nullable(),
    linkedin: z.string().trim().nullable(),
    assignedToId: z.string().nullable(),
  }),
});

export type MergeCompaniesInput = z.infer<typeof mergeCompaniesSchema>;

function asPlainObject(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

/**
 * Fuses two company records into one: applies the field-by-field choices
 * onto `keepId`, reassigns every related record (contacts, vehicles,
 * deals, notes, activities, tasks) from `removeId` to `keepId`, merges
 * customFields (kept company wins on key conflicts), then deletes
 * `removeId`. All in one transaction so a failure never leaves an
 * orphaned or half-merged company behind.
 */
export async function mergeCompaniesAction(input: MergeCompaniesInput) {
  const parsed = mergeCompaniesSchema.parse(input);
  if (parsed.keepId === parsed.removeId) {
    throw new Error("Impossible de fusionner une entreprise avec elle-même.");
  }

  const prisma = getPrisma();
  const [keep, remove] = await Promise.all([
    prisma.company.findUniqueOrThrow({ where: { id: parsed.keepId } }),
    prisma.company.findUniqueOrThrow({ where: { id: parsed.removeId } }),
  ]);

  const mergedCustomFields = {
    ...asPlainObject(remove.customFields),
    ...asPlainObject(keep.customFields),
  } as Prisma.InputJsonValue;

  // Order matters: reassign every child record off `removeId` first (some
  // relations, like Vehicle/Deal, cascade-delete with their company), then
  // delete `removeId`, and only THEN apply the chosen field values to
  // `keepId` — siret is unique, so writing a siret shared with `removeId`
  // has to happen after that row is gone, not before.
  await prisma.$transaction([
    prisma.contact.updateMany({
      where: { companyId: parsed.removeId },
      data: { companyId: parsed.keepId },
    }),
    prisma.vehicle.updateMany({
      where: { companyId: parsed.removeId },
      data: { companyId: parsed.keepId },
    }),
    prisma.deal.updateMany({
      where: { companyId: parsed.removeId },
      data: { companyId: parsed.keepId },
    }),
    prisma.note.updateMany({
      where: { companyId: parsed.removeId },
      data: { companyId: parsed.keepId },
    }),
    prisma.activity.updateMany({
      where: { companyId: parsed.removeId },
      data: { companyId: parsed.keepId },
    }),
    prisma.task.updateMany({
      where: { companyId: parsed.removeId },
      data: { companyId: parsed.keepId },
    }),
    prisma.company.delete({ where: { id: parsed.removeId } }),
    prisma.company.update({
      where: { id: parsed.keepId },
      data: { ...parsed.fields, customFields: mergedCustomFields },
    }),
  ]);

  revalidatePath("/companies");
  revalidatePath("/contacts");
  revalidatePath("/vehicles");
  revalidatePath("/deals");
  revalidatePath("/tasks");
  return parsed.keepId;
}
