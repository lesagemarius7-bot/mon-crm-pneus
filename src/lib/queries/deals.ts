import "server-only";

import { getPrisma } from "@/lib/prisma";

export type BoardDeal = Awaited<ReturnType<typeof listDealsForBoard>>[number];

/**
 * Flat list of deals with just enough related data to render a Kanban
 * card. Grouping by stage happens client-side so drag-and-drop can update
 * local state instantly without re-fetching.
 */
export async function listDealsForBoard() {
  const prisma = getPrisma();
  const deals = await prisma.deal.findMany({
    orderBy: { updatedAt: "desc" },
    include: {
      company: { select: { id: true, name: true } },
      contact: { select: { id: true, firstName: true, lastName: true } },
    },
  });

  return deals.map((deal) => ({
    ...deal,
    value: deal.value ? deal.value.toNumber() : null,
  }));
}

export async function listPipelineStages() {
  const prisma = getPrisma();
  return prisma.pipelineStage.findMany({ orderBy: { order: "asc" } });
}

export async function getDealDetail(id: string) {
  const prisma = getPrisma();
  const deal = await prisma.deal.findUnique({
    where: { id },
    include: {
      company: true,
      contact: true,
      stage: true,
      owner: true,
      notes: {
        orderBy: { createdAt: "desc" },
        include: { author: true },
      },
      activities: { orderBy: { createdAt: "desc" } },
    },
  });

  if (!deal) return null;

  return {
    ...deal,
    value: deal.value ? deal.value.toNumber() : null,
    company: {
      ...deal.company,
      estimatedRevenue: deal.company.estimatedRevenue
        ? deal.company.estimatedRevenue.toNumber()
        : null,
    },
  };
}

export type DealDetail = NonNullable<Awaited<ReturnType<typeof getDealDetail>>>;

/** Lightweight deal list for form dropdowns (e.g. the "New task" dialog's
 * deal select, filtered client-side by the chosen company). */
export async function listDealOptions() {
  const prisma = getPrisma();
  return prisma.deal.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true, companyId: true },
  });
}

export type DealOption = Awaited<ReturnType<typeof listDealOptions>>[number];
