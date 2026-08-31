import "server-only";

import { getPrisma } from "@/lib/prisma";

export async function listEmailTemplates() {
  const prisma = getPrisma();
  return prisma.emailTemplate.findMany({
    orderBy: { updatedAt: "desc" },
    include: {
      createdBy: { select: { id: true, fullName: true, email: true, avatarUrl: true } },
    },
  });
}

export type EmailTemplateRow = Awaited<ReturnType<typeof listEmailTemplates>>[number];

/** Lightweight list for pickers (sequence steps, automations, the
 * "Envoyer un email" template selector). Includes body so callers can
 * render {{variable}} substitution without a second fetch. */
export async function listEmailTemplateOptions() {
  const prisma = getPrisma();
  return prisma.emailTemplate.findMany({
    orderBy: { title: "asc" },
    select: {
      id: true,
      title: true,
      subject: true,
      body: true,
      createdBy: { select: { id: true, fullName: true, email: true, avatarUrl: true } },
    },
  });
}

export type EmailTemplateOption = Awaited<ReturnType<typeof listEmailTemplateOptions>>[number];
