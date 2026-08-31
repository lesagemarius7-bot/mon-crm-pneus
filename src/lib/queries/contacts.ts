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
    },
  });
}

export type ContactRow = Awaited<ReturnType<typeof listContacts>>[number];
