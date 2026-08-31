"use server";

import { listCompletedTasksForDate, listEmailActivitiesForDate } from "@/lib/queries/dashboard";

export async function listEmailActivitiesForDateAction(dateKeyValue: string) {
  return listEmailActivitiesForDate(dateKeyValue);
}

export async function listCompletedTasksForDateAction(dateKeyValue: string) {
  return listCompletedTasksForDate(dateKeyValue);
}
