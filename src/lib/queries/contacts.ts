import "server-only";

import { getPrisma } from "@/lib/prisma";

/**
 * Global Contacts table data — every contact with just enough company info
 * for the "Entreprise liée" column and filter.
 */
export async function listContacts() {
  const prisma = getPrisma();
  return prisma.contact.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      company: { select: { id: true, name: true } },
      assignedTo: { select: { id: true, fullName: true, email: true, avatarUrl: true } },
    },
  });
}

export type ContactRow = Awaited<ReturnType<typeof listContacts>>[number];

/** Lightweight list for pickers (sequence enrollment, list membership). */
export async function listContactOptions() {
  const prisma = getPrisma();
  return prisma.contact.findMany({
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    select: {
      id: true,
      firstName: true,
      lastName: true,
      company: { select: { id: true, name: true } },
    },
  });
}

export type ContactOption = Awaited<ReturnType<typeof listContactOptions>>[number];
