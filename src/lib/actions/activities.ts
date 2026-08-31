"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { ActivityType } from "@/generated/prisma/enums";
import { getCurrentUserId } from "@/lib/auth";
import { buildTimeline, type TimelineEntry } from "@/lib/activity-timeline";
import { ACTIVITY_TYPE_LABELS } from "@/lib/labels";
import { getPrisma } from "@/lib/prisma";

const activitySchema = z.object({
  type: z.enum(ActivityType),
  description: z.string().trim().min(1, "Le contenu est requis."),
  companyId: z.string().min(1).nullable().optional(),
  dealId: z.string().min(1).nullable().optional(),
});

export type ActivityInput = z.infer<typeof activitySchema>;

/**
 * Logs a quick activity (Appel / Rendez-vous / Email) from the drawer's
 * timeline. Subject is auto-derived from the type — the free-text goes in
 * `description` — and it's marked completed immediately since a quick
 * entry logs something that already happened.
 */
export async function createActivityAction(input: ActivityInput) {
  const parsed = activitySchema.parse(input);
  const prisma = getPrisma();
  const ownerId = await getCurrentUserId();

  const activity = await prisma.activity.create({
    data: {
      type: parsed.type,
      subject: ACTIVITY_TYPE_LABELS[parsed.type],
      description: parsed.description,
      companyId: parsed.companyId || null,
      dealId: parsed.dealId || null,
      ownerId: ownerId ?? undefined,
      completedAt: new Date(),
    },
  });

  if (parsed.companyId) revalidatePath("/companies");
  if (parsed.dealId) revalidatePath("/deals");
  return activity.id;
}

/**
 * Refetches just the timeline (notes + activities) for a company or deal
 * drawer — used to refresh the list right after a quick entry, without
 * re-fetching the whole detail (contacts, vehicles, other deals...).
 */
const sendEmailSchema = z.object({
  to: z.email("Email invalide."),
  subject: z.string().trim().min(1, "L'objet est requis."),
  body: z.string().trim().min(1, "Le message est requis."),
  companyId: z.string().min(1).nullable().optional(),
  contactId: z.string().min(1).nullable().optional(),
  dealId: z.string().min(1).nullable().optional(),
});

export type SendEmailInput = z.infer<typeof sendEmailSchema>;

/**
 * "Sending" an email here just means logging it as a completed EMAIL
 * activity — there's no outbound mail provider wired up, so the compose
 * dialog's only real effect is consigning the message to the timeline.
 */
export async function sendEmailAction(input: SendEmailInput) {
  const parsed = sendEmailSchema.parse(input);
  const prisma = getPrisma();
  const ownerId = await getCurrentUserId();

  const activity = await prisma.activity.create({
    data: {
      type: "EMAIL",
      subject: parsed.subject,
      description: `À : ${parsed.to}\n\n${parsed.body}`,
      companyId: parsed.companyId || null,
      contactId: parsed.contactId || null,
      dealId: parsed.dealId || null,
      ownerId: ownerId ?? undefined,
      completedAt: new Date(),
    },
  });

  if (parsed.companyId) revalidatePath("/companies");
  if (parsed.dealId) revalidatePath("/deals");
  return activity.id;
}

export async function getActivitiesAction(params: {
  companyId?: string;
  dealId?: string;
}): Promise<TimelineEntry[]> {
  const prisma = getPrisma();
  const where = params.companyId
    ? { companyId: params.companyId }
    : { dealId: params.dealId };

  const [notes, activities] = await Promise.all([
    prisma.note.findMany({
      where,
      include: { author: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.activity.findMany({ where, orderBy: { createdAt: "desc" } }),
  ]);

  return buildTimeline(notes, activities);
}
