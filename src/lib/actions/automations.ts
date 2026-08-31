"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { AutomationActionType, AutomationTrigger, TaskType } from "@/generated/prisma/enums";
import { getPrisma } from "@/lib/prisma";

const automationSchema = z.object({
  name: z.string().trim().min(1, "Le nom est requis."),
  trigger: z.enum(AutomationTrigger),
  actionType: z.enum(AutomationActionType),
  templateId: z.string().min(1).nullable().optional(),
  taskSubject: z.string().trim().nullable().optional(),
  taskType: z.enum(TaskType).nullable().optional(),
  taskReason: z.string().trim().nullable().optional(),
  delayDays: z.number().int().min(0),
});

export type AutomationInput = z.infer<typeof automationSchema>;

function toData(parsed: AutomationInput) {
  return {
    name: parsed.name,
    trigger: parsed.trigger,
    actionType: parsed.actionType,
    delayDays: parsed.delayDays,
    templateId: parsed.actionType === "SEND_EMAIL_TEMPLATE" ? parsed.templateId || null : null,
    taskSubject: parsed.actionType === "CREATE_TASK" ? parsed.taskSubject || null : null,
    taskType: parsed.actionType === "CREATE_TASK" ? (parsed.taskType ?? null) : null,
    taskReason: parsed.actionType === "CREATE_TASK" ? parsed.taskReason || null : null,
  };
}

export async function createAutomationAction(input: AutomationInput) {
  const parsed = automationSchema.parse(input);
  const prisma = getPrisma();

  const automation = await prisma.automation.create({ data: toData(parsed) });

  revalidatePath("/automations");
  return automation.id;
}

export async function updateAutomationAction(id: string, input: AutomationInput) {
  const parsed = automationSchema.parse(input);
  const prisma = getPrisma();

  await prisma.automation.update({ where: { id }, data: toData(parsed) });

  revalidatePath("/automations");
  return id;
}

export async function toggleAutomationActiveAction(id: string, isActive: boolean) {
  const prisma = getPrisma();
  await prisma.automation.update({ where: { id }, data: { isActive } });
  revalidatePath("/automations");
}

export async function deleteAutomationAction(id: string) {
  const prisma = getPrisma();
  await prisma.automation.delete({ where: { id } });
  revalidatePath("/automations");
}
