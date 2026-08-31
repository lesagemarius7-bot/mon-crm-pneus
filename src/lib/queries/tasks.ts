import "server-only";

import type { Prisma, TaskStatus, TaskType } from "@/generated/prisma/client";
import { getPrisma } from "@/lib/prisma";

export type DueFilter =
  | "TODAY"
  | "TOMORROW"
  | "3_DAYS"
  | "1_MONTH"
  | "6_MONTHS"
  | "OVERDUE"
  | "ALL";

export type TaskFilters = {
  companyId?: string;
  contactId?: string;
  dealId?: string;
  dueFilter?: DueFilter;
  status?: TaskStatus;
  type?: TaskType;
  assignedToId?: string;
};

function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function addMonths(date: Date, months: number): Date {
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  return d;
}

function getDueDateRange(
  filter: DueFilter | undefined
): { start: Date; end?: Date; overdue?: boolean } | null {
  if (!filter || filter === "ALL") return null;
  const today = startOfDay(new Date());

  switch (filter) {
    case "OVERDUE":
      return { start: today, overdue: true };
    case "TODAY":
      return { start: today, end: addDays(today, 1) };
    case "TOMORROW": {
      const tomorrow = addDays(today, 1);
      return { start: tomorrow, end: addDays(tomorrow, 1) };
    }
    case "3_DAYS":
      return { start: today, end: addDays(today, 3) };
    case "1_MONTH":
      return { start: today, end: addMonths(today, 1) };
    case "6_MONTHS":
      return { start: today, end: addMonths(today, 6) };
  }
}

export async function listTasks(filters: TaskFilters = {}) {
  const prisma = getPrisma();
  const where: Prisma.TaskWhereInput = {};

  if (filters.companyId) where.companyId = filters.companyId;
  if (filters.contactId) where.contactId = filters.contactId;
  if (filters.dealId) where.dealId = filters.dealId;
  if (filters.type) where.type = filters.type;
  if (filters.assignedToId) where.ownerId = filters.assignedToId;

  if (filters.status) {
    where.status = filters.status;
  } else if (filters.dueFilter === "OVERDUE") {
    // Completed tasks in the past aren't "late" — default to open ones
    // unless the caller explicitly asked for a specific status.
    where.status = "A_FAIRE";
  }

  const dueRange = getDueDateRange(filters.dueFilter);
  if (dueRange) {
    where.dueDate = dueRange.overdue
      ? { lt: dueRange.start }
      : { gte: dueRange.start, ...(dueRange.end ? { lt: dueRange.end } : {}) };
  }

  return prisma.task.findMany({
    where,
    orderBy: [{ dueDate: "asc" }, { createdAt: "desc" }],
    include: {
      company: { select: { id: true, name: true } },
      contact: { select: { id: true, firstName: true, lastName: true } },
      deal: { select: { id: true, name: true } },
      owner: { select: { id: true, fullName: true, email: true, avatarUrl: true } },
    },
  });
}

export type TaskRow = Awaited<ReturnType<typeof listTasks>>[number];
