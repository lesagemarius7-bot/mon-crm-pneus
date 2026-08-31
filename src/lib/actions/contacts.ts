"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { ContactRole } from "@/generated/prisma/enums";
import { resolveEnumValue, splitFullName } from "@/lib/csv-import-utils";
import { CONTACT_ROLE_LABELS } from "@/lib/labels";
import { getPrisma } from "@/lib/prisma";
import { listContactOptions } from "@/lib/queries/contacts";
import type { ImportResult } from "@/components/import/import-csv-dialog";

export async function listContactOptionsAction() {
  return listContactOptions();
}

const contactSchema = z.object({
  firstName: z.string().trim().min(1, "Le prénom est requis."),
  lastName: z.string().trim().min(1, "Le nom est requis."),
  email: z.email("Email invalide.").or(z.literal("")).nullable().optional(),
  phone: z.string().trim().nullable().optional(),
  role: z.enum(ContactRole),
  companyId: z.string().min(1, "Entreprise requise."),
});

export type ContactFormInput = z.infer<typeof contactSchema>;

export async function createContactAction(input: ContactFormInput) {
  const parsed = contactSchema.parse(input);
  const prisma = getPrisma();

  const contact = await prisma.contact.create({
    data: {
      firstName: parsed.firstName,
      lastName: parsed.lastName,
      email: parsed.email || null,
      phone: parsed.phone || null,
      role: parsed.role,
      companyId: parsed.companyId,
    },
  });

  revalidatePath("/companies");
  revalidatePath("/contacts");
  return contact.id;
}

export async function updateContactAction(id: string, input: ContactFormInput) {
  const parsed = contactSchema.parse(input);
  const prisma = getPrisma();

  await prisma.contact.update({
    where: { id },
    data: {
      firstName: parsed.firstName,
      lastName: parsed.lastName,
      email: parsed.email || null,
      phone: parsed.phone || null,
      role: parsed.role,
      companyId: parsed.companyId,
    },
  });

  revalidatePath("/companies");
  revalidatePath("/contacts");
  return id;
}

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Bulk-imports contacts from a mapped CSV (see ImportCsvDialog).
 *
 * - Company is optional: an empty/unmapped "Entreprise" cell just leaves
 *   the contact unattached (companyId: null).
 * - When a company name IS given but doesn't match an existing company,
 *   it's created on the fly (case-insensitive matching + dedup within the
 *   batch, so 20 rows for the same new company only create it once).
 * - If only one of firstName/lastName came through (a single "Nom" column
 *   holding the full name), the non-empty one is split on the first space
 *   instead of failing the row.
 */
export async function importContactsAction(
  rows: Record<string, string>[]
): Promise<ImportResult> {
  const prisma = getPrisma();

  const companies = await prisma.company.findMany({
    select: { id: true, name: true },
  });
  const companyIdByName = new Map(
    companies.map((c) => [c.name.trim().toLowerCase(), c.id])
  );

  // Create any companies referenced by name but not found, once per
  // distinct (case-insensitive) name, before resolving contact rows.
  const missingCompanyNames = new Map<string, string>(); // lowercase -> original casing
  for (const row of rows) {
    const companyName = (row.companyName ?? "").trim();
    if (!companyName) continue;
    const key = companyName.toLowerCase();
    if (!companyIdByName.has(key) && !missingCompanyNames.has(key)) {
      missingCompanyNames.set(key, companyName);
    }
  }
  if (missingCompanyNames.size > 0) {
    const namesToCreate = Array.from(missingCompanyNames.values());
    await prisma.company.createMany({
      data: namesToCreate.map((name) => ({ name })),
      skipDuplicates: true,
    });
    const created = await prisma.company.findMany({
      where: { name: { in: namesToCreate } },
      select: { id: true, name: true },
    });
    for (const c of created) {
      companyIdByName.set(c.name.trim().toLowerCase(), c.id);
    }
  }

  const errors: ImportResult["errors"] = [];
  const validRows: {
    firstName: string;
    lastName: string;
    email: string | null;
    phone: string | null;
    role: ContactRole;
    companyId: string | null;
  }[] = [];

  rows.forEach((row, index) => {
    const lineNumber = index + 2; // +1 for 0-index, +1 for the header row
    let firstName = (row.firstName ?? "").trim();
    let lastName = (row.lastName ?? "").trim();
    const companyName = (row.companyName ?? "").trim();
    const email = (row.email ?? "").trim();

    if (!firstName && lastName) {
      ({ firstName, lastName } = splitFullName(lastName));
    } else if (!lastName && firstName) {
      ({ firstName, lastName } = splitFullName(firstName));
    }

    if (!firstName || !lastName) {
      errors.push({ row: lineNumber, message: "Prénom ou nom manquant." });
      return;
    }
    if (email && !emailPattern.test(email)) {
      errors.push({ row: lineNumber, message: `Email invalide : "${email}".` });
      return;
    }

    // Every referenced company name was either already in the DB or just
    // created above, so a miss here would only mean the createMany raced
    // with itself on a name — fall back to unattached rather than drop
    // the whole row.
    const companyId = companyName
      ? (companyIdByName.get(companyName.toLowerCase()) ?? null)
      : null;

    validRows.push({
      firstName,
      lastName,
      email: email || null,
      phone: row.phone?.trim() || null,
      role: resolveEnumValue(row.role ?? "", ContactRole, CONTACT_ROLE_LABELS, "AUTRE"),
      companyId,
    });
  });

  const result =
    validRows.length > 0
      ? await prisma.contact.createMany({ data: validRows })
      : { count: 0 };

  revalidatePath("/companies");
  revalidatePath("/contacts");
  return { successCount: result.count, errors };
}

/**
 * Unlinks a contact from its company without deleting the contact record —
 * the "Détacher" action in the Company drawer's contacts panel, distinct
 * from deleteContactsAction which removes it entirely.
 */
export async function detachContactFromCompanyAction(contactId: string) {
  const prisma = getPrisma();
  await prisma.contact.update({
    where: { id: contactId },
    data: { companyId: null },
  });

  revalidatePath("/companies");
  revalidatePath("/contacts");
  return contactId;
}

export async function deleteContactsAction(ids: string[]) {
  const prisma = getPrisma();
  const result = await prisma.contact.deleteMany({ where: { id: { in: ids } } });

  revalidatePath("/contacts");
  revalidatePath("/companies");
  return result.count;
}
