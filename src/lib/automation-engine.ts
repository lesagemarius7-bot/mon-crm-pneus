import "server-only";

import type { AutomationTrigger } from "@/generated/prisma/enums";
import { getCurrentUserId } from "@/lib/auth";
import { getPrisma } from "@/lib/prisma";
import { renderTemplate, type TemplateContext } from "@/lib/template-render";

type TriggeringDeal = {
  id: string;
  name: string;
  value: number | null;
  companyId: string;
  contactId: string | null;
  stageName: string;
};

/**
 * Runs every active Automation configured for `trigger` against `deal` —
 * called synchronously from moveDealStageAction right after a deal moves
 * into a Won/Lost stage. No queue or cron needed: a deal only changes
 * stage through that one action, so this always runs exactly once per
 * transition.
 */
export async function runAutomationsForTrigger(
  trigger: AutomationTrigger,
  deal: TriggeringDeal
): Promise<void> {
  const prisma = getPrisma();
  const automations = await prisma.automation.findMany({
    where: { trigger, isActive: true },
  });
  if (automations.length === 0) return;

  const [company, contact, ownerId] = await Promise.all([
    prisma.company.findUnique({ where: { id: deal.companyId } }),
    deal.contactId ? prisma.contact.findUnique({ where: { id: deal.contactId } }) : null,
    getCurrentUserId(),
  ]);

  const context: TemplateContext = {
    contact,
    company,
    deal: { name: deal.name, amount: deal.value, stage: deal.stageName },
  };

  const now = new Date();

  for (const automation of automations) {
    if (automation.actionType === "CREATE_TASK") {
      await prisma.task.create({
        data: {
          subject: renderTemplate(automation.taskSubject || "Suivi automatique", context),
          reason: automation.taskReason ? renderTemplate(automation.taskReason, context) : null,
          type: automation.taskType ?? "RELANCE_EMAIL",
          dueDate: new Date(now.getTime() + automation.delayDays * 24 * 60 * 60 * 1000),
          companyId: deal.companyId,
          contactId: deal.contactId,
          dealId: deal.id,
          ownerId: ownerId ?? undefined,
        },
      });
    } else if (automation.actionType === "SEND_EMAIL_TEMPLATE" && automation.templateId) {
      const template = await prisma.emailTemplate.findUnique({
        where: { id: automation.templateId },
      });
      if (template) {
        await prisma.activity.create({
          data: {
            type: "EMAIL",
            subject: renderTemplate(template.subject, context),
            description: renderTemplate(template.body, context),
            companyId: deal.companyId,
            contactId: deal.contactId,
            dealId: deal.id,
            ownerId: ownerId ?? undefined,
            completedAt: now,
          },
        });
      }
    }
  }
}
