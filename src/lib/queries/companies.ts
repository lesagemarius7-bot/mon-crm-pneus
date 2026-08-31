import "server-only";

import { getPrisma } from "@/lib/prisma";

export type CompanyRow = Awaited<ReturnType<typeof listCompanies>>[number];

/**
 * List view data for the Entreprises table. Keeps the query cheap
 * (aggregate counts only) — full related records load lazily in the
 * detail drawer via getCompanyDetail().
 */
export async function listCompanies() {
  const prisma = getPrisma();
  const companies = await prisma.company.findMany({
    orderBy: { updatedAt: "desc" },
    include: {
      _count: {
        select: { contacts: true, vehicles: true, deals: true },
      },
      assignedTo: { select: { id: true, fullName: true, email: true, avatarUrl: true } },
    },
  });

  // Decimal (decimal.js) isn't a plain serializable value across the
  // Server -> Client Component boundary — convert to a plain number.
  return companies.map((company) => ({
    ...company,
    estimatedRevenue: company.estimatedRevenue
      ? company.estimatedRevenue.toNumber()
      : null,
  }));
}

export async function getCompanyDetail(id: string) {
  const prisma = getPrisma();
  const company = await prisma.company.findUnique({
    where: { id },
    include: {
      contacts: { orderBy: { lastName: "asc" } },
      vehicles: { orderBy: { updatedAt: "desc" } },
      deals: {
        orderBy: { updatedAt: "desc" },
        include: { stage: true },
      },
      notes: {
        orderBy: { createdAt: "desc" },
        take: 20,
        include: { author: true },
      },
      activities: {
        orderBy: { createdAt: "desc" },
        take: 20,
      },
      assignedTo: { select: { id: true, fullName: true, email: true, avatarUrl: true } },
    },
  });

  if (!company) return null;

  return {
    ...company,
    estimatedRevenue: company.estimatedRevenue
      ? company.estimatedRevenue.toNumber()
      : null,
    deals: company.deals.map((deal) => ({
      ...deal,
      value: deal.value ? deal.value.toNumber() : null,
    })),
  };
}

export type CompanyDetail = NonNullable<
  Awaited<ReturnType<typeof getCompanyDetail>>
>;

/**
 * Lightweight company + contact list for form dropdowns (e.g. the "New
 * deal" dialog's company/contact selects).
 */
export async function listCompanyOptions() {
  const prisma = getPrisma();
  return prisma.company.findMany({
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      contacts: {
        orderBy: { lastName: "asc" },
        select: { id: true, firstName: true, lastName: true },
      },
    },
  });
}

export type CompanyOption = Awaited<ReturnType<typeof listCompanyOptions>>[number];
