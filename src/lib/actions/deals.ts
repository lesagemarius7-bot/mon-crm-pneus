"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { STAGE_CHANGE_PREFIX } from "@/lib/activity-timeline";
import { runAutomationsForTrigger } from "@/lib/automation-engine";
import { getCurrentUserId } from "@/lib/auth";
import { notifyAssignment } from "@/lib/notifications";
import { getPrisma } from "@/lib/prisma";
import { getDealDetail, listPipelineStages } from "@/lib/queries/deals";

export async function getDealDetailAction(id: string) {
  return getDealDetail(id);
}

export async function listPipelineStagesAction() {
  return listPipelineStages();
}

const createDealSchema = z.object({
  name: z.string().trim().min(1, "Nom requis"),
  companyId: z.string().min(1, "Entreprise requise"),
  contactId: z.string().min(1).nullable().optional(),
  stageId: z.string().min(1, "Étape requise"),
  value: z.number().min(0).nullable().optional(),
  proposedBrand: z.string().trim().nullable().optional(),
  expectedCloseDate: z.coerce.date().nullable().optional(),
  ownerId: z.string().min(1).nullable().optional(),
});

export type CreateDealInput = z.infer<typeof createDealSchema>;

/**
 * Creates a deal (from the "+ Nouveau Deal" dialog, global or per-column)
 * and returns it shaped exactly like listDealsForBoard()'s rows, so the
 * Kanban board can splice it into local state instantly instead of
 * re-fetching the whole board.
 */
export async function createDealAction(input: CreateDealInput) {
  const parsed = createDealSchema.parse(input);
  const prisma = getPrisma();
  const actorId = await getCurrentUserId();

  const deal = await prisma.deal.create({
    data: {
      name: parsed.name,
      companyId: parsed.companyId,
      contactId: parsed.contactId || null,
      stageId: parsed.stageId,
      value: parsed.value ?? null,
      proposedBrand: parsed.proposedBrand || null,
      expectedCloseDate: parsed.expectedCloseDate ?? null,
      ownerId: parsed.ownerId || null,
    },
    include: {
      company: { select: { id: true, name: true } },
      contact: { select: { id: true, firstName: true, lastName: true } },
      owner: { select: { id: true, fullName: true, email: true, avatarUrl: true } },
    },
  });

  await notifyAssignment({
    recipientId: parsed.ownerId,
    actorId,
    type: "DEAL_ASSIGNED",
    entityLabel: `le deal « ${deal.name} »`,
    link: `/deals?deal=${deal.id}`,
  });

  revalidatePath("/deals");
  revalidatePath("/companies");

  return {
    ...deal,
    value: deal.value ? deal.value.toNumber() : null,
  };
}

/**
 * Moves a deal to a different pipeline stage (drag-and-drop). Sets/clears
 * closedAt based on whether the destination stage is a terminal
 * (won/lost) stage, mirroring what changing status manually would do, and
 * logs the transition as an Activity so it shows up in the deal's
 * "Activités & Suivi" timeline with its own icon. When the destination
 * stage is a Won or Lost stage, also runs any active Automations
 * configured for that trigger (see src/lib/automation-engine.ts).
 */
export async function moveDealStageAction(dealId: string, stageId: string) {
  const prisma = getPrisma();

  const [deal, stage, ownerId] = await Promise.all([
    prisma.deal.findUniqueOrThrow({
      where: { id: dealId },
      include: { stage: true },
    }),
    prisma.pipelineStage.findUniqueOrThrow({ where: { id: stageId } }),
    getCurrentUserId(),
  ]);

  if (deal.stageId === stageId) return;

  await prisma.$transaction([
    prisma.deal.update({
      where: { id: dealId },
      data: {
        stageId,
        closedAt: stage.isWon || stage.isLost ? new Date() : null,
      },
    }),
    prisma.activity.create({
      data: {
        dealId,
        type: "AUTRE",
        subject: `${STAGE_CHANGE_PREFIX} ${deal.stage.name} → ${stage.name}`,
        completedAt: new Date(),
        ownerId: ownerId ?? undefined,
      },
    }),
  ]);

  if (stage.isWon || stage.isLost) {
    await runAutomationsForTrigger(stage.isWon ? "DEAL_WON" : "DEAL_LOST", {
      id: dealId,
      name: deal.name,
      value: deal.value ? deal.value.toNumber() : null,
      companyId: deal.companyId,
      contactId: deal.contactId,
      stageName: stage.name,
    });
  }

  revalidatePath("/deals");
  revalidatePath("/tasks");
  revalidatePath("/companies");
}

/** Reassigns a deal's owner — used by the "Propriétaire / Assigné à"
 * selector in the Kanban card and detail sheet. */
export async function updateDealOwnerAction(dealId: string, ownerId: string | null) {
  const prisma = getPrisma();
  const actorId = await getCurrentUserId();
  const deal = await prisma.deal.update({ where: { id: dealId }, data: { ownerId } });

  await notifyAssignment({
    recipientId: ownerId,
    actorId,
    type: "DEAL_ASSIGNED",
    entityLabel: `le deal « ${deal.name} »`,
    link: `/deals?deal=${deal.id}`,
  });

  revalidatePath("/deals");
}
