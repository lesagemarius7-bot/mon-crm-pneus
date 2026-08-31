"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { CompanyStatus, CompanyType } from "@/generated/prisma/enums";
import { parseOptionalInt, parseOptionalNumber, resolveEnumValue } from "@/lib/csv-import-utils";
import { COMPANY_STATUS_LABELS, COMPANY_TYPE_LABELS } from "@/lib/labels";
import { getPrisma } from "@/lib/prisma";
import { getCompanyDetail } from "@/lib/queries/companies";
import type { ImportResult } from "@/components/import/import-csv-dialog";

export async function getCompanyDetailAction(id: string) {
  return getCompanyDetail(id);
}

const companySchema = z.object({
  name: z.string().trim().min(1, "Le nom est requis."),
  siret: z.string().trim().nullable().optional(),
  type: z.enum(CompanyType),
  status: z.enum(CompanyStatus),
  fleetSize: z.number().int().min(0).nullable().optional(),
  estimatedRevenue: z.number().min(0).nullable().optional(),
});

export type CompanyFormInput = z.infer<typeof companySchema>;

export async function createCompanyAction(input: CompanyFormInput) {
  const parsed = companySchema.parse(input);
  const prisma = getPrisma();

  const company = await prisma.company.create({
    data: {
      name: parsed.name,
      siret: parsed.siret || null,
      type: parsed.type,
      status: parsed.status,
      fleetSize: parsed.fleetSize ?? null,
      estimatedRevenue: parsed.estimatedRevenue ?? null,
    },
  });

  revalidatePath("/companies");
  return company.id;
}

export async function updateCompanyAction(id: string, input: CompanyFormInput) {
  const parsed = companySchema.parse(input);
  const prisma = getPrisma();

  await prisma.company.update({
    where: { id },
    data: {
      name: parsed.name,
      siret: parsed.siret || null,
      type: parsed.type,
      status: parsed.status,
      fleetSize: parsed.fleetSize ?? null,
      estimatedRevenue: parsed.estimatedRevenue ?? null,
    },
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

  await prisma.company.update({ where: { id }, data: parsed });

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
