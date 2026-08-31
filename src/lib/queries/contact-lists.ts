import "server-only";

import type { CompanyStatus, CompanyType, ContactListType } from "@/generated/prisma/enums";
import { getPrisma } from "@/lib/prisma";

export type ContactListFilters = {
  companyStatus?: CompanyStatus | null;
  companyType?: CompanyType | null;
  minDealValue?: number | null;
};

export async function listContactLists() {
  const prisma = getPrisma();
  return prisma.contactList.findMany({
    orderBy: { updatedAt: "desc" },
    include: { _count: { select: { members: true } } },
  });
}

export type ContactListRow = Awaited<ReturnType<typeof listContactLists>>[number];

export async function listContactListOptions() {
  const prisma = getPrisma();
  return prisma.contactList.findMany({
    where: { type: "STATIC" },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });
}

export type ContactListOption = Awaited<ReturnType<typeof listContactListOptions>>[number];

/** Resolves the actual member contacts of a list — the stored membership
 * rows for STATIC lists, or a live query against `filters` for DYNAMIC
 * ones (status / secteur / montant de deal minimum). */
export async function getContactListMembers(list: {
  id: string;
  type: ContactListType;
  filters: unknown;
}) {
  const prisma = getPrisma();

  if (list.type === "STATIC") {
    const memberships = await prisma.contactListMembership.findMany({
      where: { listId: list.id },
      orderBy: { addedAt: "desc" },
      include: { contact: { include: { company: { select: { id: true, name: true } } } } },
    });
    return memberships.map((m) => ({ membershipId: m.id, ...m.contact }));
  }

  const filters = (list.filters ?? {}) as ContactListFilters;
  const contacts = await prisma.contact.findMany({
    where: {
      company: {
        ...(filters.companyStatus ? { status: filters.companyStatus } : {}),
        ...(filters.companyType ? { type: filters.companyType } : {}),
        ...(filters.minDealValue
          ? { deals: { some: { value: { gte: filters.minDealValue } } } }
          : {}),
      },
    },
    include: { company: { select: { id: true, name: true } } },
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
  });
  return contacts.map((c) => ({ membershipId: null as string | null, ...c }));
}

export async function getContactListDetail(id: string) {
  const prisma = getPrisma();
  const list = await prisma.contactList.findUnique({ where: { id } });
  if (!list) return null;

  const members = await getContactListMembers(list);
  return { ...list, members };
}

export type ContactListDetail = NonNullable<Awaited<ReturnType<typeof getContactListDetail>>>;
