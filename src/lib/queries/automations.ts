import "server-only";

import { getPrisma } from "@/lib/prisma";

export async function listAutomations() {
  const prisma = getPrisma();
  return prisma.automation.findMany({
    orderBy: { createdAt: "desc" },
    include: { template: { select: { id: true, title: true } } },
  });
}

export type AutomationRow = Awaited<ReturnType<typeof listAutomations>>[number];
