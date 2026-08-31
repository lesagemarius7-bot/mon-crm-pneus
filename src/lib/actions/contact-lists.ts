"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { CompanyStatus, CompanyType, ContactListType } from "@/generated/prisma/enums";
import { Prisma } from "@/generated/prisma/client";
import { getPrisma } from "@/lib/prisma";
import { getContactListDetail, listContactListOptions } from "@/lib/queries/contact-lists";

export async function getContactListDetailAction(id: string) {
  return getContactListDetail(id);
}

export async function listContactListOptionsAction() {
  return listContactListOptions();
}

const filtersSchema = z.object({
  companyStatus: z.enum(CompanyStatus).nullable().optional(),
  companyType: z.enum(CompanyType).nullable().optional(),
  minDealValue: z.number().min(0).nullable().optional(),
});

const contactListSchema = z.object({
  name: z.string().trim().min(1, "Le nom est requis."),
  type: z.enum(ContactListType),
  filters: filtersSchema.nullable().optional(),
});

export type ContactListInput = z.infer<typeof contactListSchema>;

export async function createContactListAction(input: ContactListInput) {
  const parsed = contactListSchema.parse(input);
  const prisma = getPrisma();

  const list = await prisma.contactList.create({
    data: {
      name: parsed.name,
      type: parsed.type,
      filters: parsed.type === "DYNAMIC" ? (parsed.filters ?? {}) : undefined,
    },
  });

  revalidatePath("/lists");
  return list.id;
}

export async function updateContactListAction(id: string, input: ContactListInput) {
  const parsed = contactListSchema.parse(input);
  const prisma = getPrisma();

  await prisma.contactList.update({
    where: { id },
    data: {
      name: parsed.name,
      type: parsed.type,
      filters:
        parsed.type === "DYNAMIC"
          ? ((parsed.filters ?? {}) as Prisma.InputJsonValue)
          : Prisma.DbNull,
    },
  });

  revalidatePath("/lists");
  return id;
}

export async function deleteContactListAction(id: string) {
  const prisma = getPrisma();
  await prisma.contactList.delete({ where: { id } });
  revalidatePath("/lists");
}

/** Bulk-adds contacts to a STATIC list — used by the "Ajouter à une liste"
 * bulk action from the Contacts table, and the list detail view's own
 * "+ Ajouter des contacts". Duplicates are silently skipped. */
export async function addContactsToListAction(listId: string, contactIds: string[]) {
  const prisma = getPrisma();
  const list = await prisma.contactList.findUniqueOrThrow({ where: { id: listId } });
  if (list.type !== "STATIC") {
    throw new Error("Impossible d'ajouter manuellement des contacts à une liste dynamique.");
  }

  const result = await prisma.contactListMembership.createMany({
    data: contactIds.map((contactId) => ({ listId, contactId })),
    skipDuplicates: true,
  });

  revalidatePath("/lists");
  revalidatePath("/contacts");
  return result.count;
}

export async function removeContactFromListAction(membershipId: string) {
  const prisma = getPrisma();
  await prisma.contactListMembership.delete({ where: { id: membershipId } });
  revalidatePath("/lists");
}
