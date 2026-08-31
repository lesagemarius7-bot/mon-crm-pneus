"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { TaskPriority, TaskStatus, TaskType } from "@/generated/prisma/enums";
import { getCurrentUserId } from "@/lib/auth";
import { notifyAssignment } from "@/lib/notifications";
import { getPrisma } from "@/lib/prisma";
import { listTasks, type TaskFilters } from "@/lib/queries/tasks";

export async function listTasksAction(filters: TaskFilters = {}) {
  return listTasks(filters);
}

const createTaskSchema = z.object({
  subject: z.string().trim().min(1, "Le sujet est requis."),
  reason: z.string().trim().nullable().optional(),
  type: z.enum(TaskType),
  priority: z.enum(TaskPriority),
  dueDate: z.coerce.date().nullable().optional(),
  companyId: z.string().min(1).nullable().optional(),
  contactId: z.string().min(1).nullable().optional(),
  dealId: z.string().min(1).nullable().optional(),
  ownerId: z.string().min(1).nullable().optional(),
});

export type CreateTaskInput = z.infer<typeof createTaskSchema>;

export async function createTaskAction(input: CreateTaskInput) {
  const parsed = createTaskSchema.parse(input);
  const prisma = getPrisma();
  const actorId = await getCurrentUserId();
  const ownerId = parsed.ownerId !== undefined ? parsed.ownerId : actorId;

  const task = await prisma.task.create({
    data: {
      subject: parsed.subject,
      reason: parsed.reason || null,
      type: parsed.type,
      priority: parsed.priority,
      dueDate: parsed.dueDate ?? null,
      companyId: parsed.companyId || null,
      contactId: parsed.contactId || null,
      dealId: parsed.dealId || null,
      ownerId: ownerId || null,
    },
  });

  await notifyAssignment({
    recipientId: ownerId,
    actorId,
    type: "TASK_ASSIGNED",
    entityLabel: `la tâche « ${parsed.subject} »`,
    link: "/tasks",
  });

  revalidatePath("/tasks");
  if (parsed.companyId) revalidatePath("/companies");
  if (parsed.contactId) revalidatePath("/contacts");
  if (parsed.dealId) revalidatePath("/deals");
  return task.id;
}

export async function toggleTaskStatusAction(id: string, status: TaskStatus) {
  const prisma = getPrisma();
  const task = await prisma.task.update({
    where: { id },
    data: {
      status,
      completedAt: status === "TERMINEE" ? new Date() : null,
    },
  });

  revalidatePath("/tasks");
  if (task.companyId) revalidatePath("/companies");
  if (task.contactId) revalidatePath("/contacts");
  if (task.dealId) revalidatePath("/deals");
  return task.id;
}

const updateTaskSchema = z.object({
  dueDate: z.coerce.date().nullable().optional(),
  status: z.enum(TaskStatus).optional(),
});

export type UpdateTaskInput = z.infer<typeof updateTaskSchema>;

/**
 * Partial update used by the Kanban board's drag-and-drop: dropping a
 * card on a due-date column sets a new dueDate (and reopens the task if
 * it was done), while dropping on the "Plus tard / Terminées" column
 * flips status instead — see TaskKanbanBoard for the column → payload
 * mapping. Mirrors toggleTaskStatusAction's completedAt bookkeeping when
 * status is part of the update.
 */
export async function updateTaskAction(id: string, input: UpdateTaskInput) {
  const parsed = updateTaskSchema.parse(input);
  const prisma = getPrisma();

  const task = await prisma.task.update({
    where: { id },
    data: {
      ...(parsed.dueDate !== undefined ? { dueDate: parsed.dueDate } : {}),
      ...(parsed.status
        ? {
            status: parsed.status,
            completedAt: parsed.status === "TERMINEE" ? new Date() : null,
          }
        : {}),
    },
  });

  revalidatePath("/tasks");
  if (task.companyId) revalidatePath("/companies");
  if (task.contactId) revalidatePath("/contacts");
  if (task.dealId) revalidatePath("/deals");
  return task.id;
}

/** Reassigns a task's owner — used by the "Propriétaire / Assigné à"
 * selector in the task table/Kanban card. */
export async function updateTaskOwnerAction(id: string, ownerId: string | null) {
  const prisma = getPrisma();
  const actorId = await getCurrentUserId();
  const task = await prisma.task.update({ where: { id }, data: { ownerId } });

  await notifyAssignment({
    recipientId: ownerId,
    actorId,
    type: "TASK_ASSIGNED",
    entityLabel: `la tâche « ${task.subject} »`,
    link: "/tasks",
  });

  revalidatePath("/tasks");
  if (task.companyId) revalidatePath("/companies");
  if (task.contactId) revalidatePath("/contacts");
  if (task.dealId) revalidatePath("/deals");
  return task.id;
}

export async function deleteTaskAction(id: string) {
  const prisma = getPrisma();
  const task = await prisma.task.delete({ where: { id } });

  revalidatePath("/tasks");
  if (task.companyId) revalidatePath("/companies");
  if (task.contactId) revalidatePath("/contacts");
  if (task.dealId) revalidatePath("/deals");
}
