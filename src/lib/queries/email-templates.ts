import "server-only";

import { getPrisma } from "@/lib/prisma";

export async function listEmailTemplates() {
  const prisma = getPrisma();
  return prisma.emailTemplate.findMany({ orderBy: { updatedAt: "desc" } });
}

export type EmailTemplateRow = Awaited<ReturnType<typeof listEmailTemplates>>[number];

/** Lightweight list for pickers (sequence steps, automations). */
export async function listEmailTemplateOptions() {
  const prisma = getPrisma();
  return prisma.emailTemplate.findMany({
    orderBy: { title: "asc" },
    select: { id: true, title: true, subject: true },
  });
}

export type EmailTemplateOption = Awaited<ReturnType<typeof listEmailTemplateOptions>>[number];
