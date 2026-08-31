import type { TaskStatus } from "@/generated/prisma/enums";

export type TaskBucket = "OVERDUE" | "TODAY" | "UPCOMING" | "LATER_OR_DONE";

export const TASK_BUCKETS: { id: TaskBucket; label: string }[] = [
  { id: "OVERDUE", label: "En retard" },
  { id: "TODAY", label: "Aujourd'hui" },
  { id: "UPCOMING", label: "À venir (3j à 1 mois)" },
  { id: "LATER_OR_DONE", label: "Plus tard / Terminées" },
];

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

/** Partitions every task into exactly one of the 4 Kanban columns — a
 * completed task or one with no due date always lands in the last
 * (catch-all) column, regardless of how far its date is. */
export function getTaskBucket(task: {
  status: TaskStatus;
  dueDate: Date | string | null;
}): TaskBucket {
  if (task.status === "TERMINEE" || !task.dueDate) return "LATER_OR_DONE";

  const today = startOfDay(new Date());
  const due = startOfDay(new Date(task.dueDate));
  const oneMonthOut = addMonths(today, 1);

  if (due < today) return "OVERDUE";
  if (due.getTime() === today.getTime()) return "TODAY";
  if (due <= oneMonthOut) return "UPCOMING";
  return "LATER_OR_DONE";
}

/**
 * What dropping a card on a column actually changes. The first three
 * columns are date buckets, so dropping there sets a representative
 * dueDate and reopens the task if it had been marked done. The last
 * column doubles as "done", so dropping there flips status instead of
 * touching the date.
 */
export function getBucketDropPayload(
  bucket: TaskBucket
): { dueDate?: Date | null; status?: TaskStatus } {
  const today = startOfDay(new Date());
  switch (bucket) {
    case "OVERDUE":
      return { dueDate: addDays(today, -1), status: "A_FAIRE" };
    case "TODAY":
      return { dueDate: today, status: "A_FAIRE" };
    case "UPCOMING":
      return { dueDate: addDays(today, 7), status: "A_FAIRE" };
    case "LATER_OR_DONE":
      return { status: "TERMINEE" };
  }
}
