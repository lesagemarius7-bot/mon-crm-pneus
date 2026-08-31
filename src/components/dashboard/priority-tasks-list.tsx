"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";

import type { PriorityTask } from "@/lib/queries/dashboard";
import { toggleTaskStatusAction } from "@/lib/actions/tasks";
import { TASK_PRIORITY_LABELS, TASK_TYPE_LABELS } from "@/lib/labels";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";

/** Top-5 "due today" tasks with a quick-complete checkbox — the dashboard
 * only ever shows tasks still A_FAIRE, so completing one just removes it
 * from view (no need to reflect the TERMINEE state visually). */
export function PriorityTasksList({ tasks }: { tasks: PriorityTask[] }) {
  const [completedIds, setCompletedIds] = useState<Set<string>>(new Set());

  async function handleComplete(task: PriorityTask) {
    setCompletedIds((prev) => new Set(prev).add(task.id));
    try {
      await toggleTaskStatusAction(task.id, "TERMINEE");
    } catch (error) {
      setCompletedIds((prev) => {
        const next = new Set(prev);
        next.delete(task.id);
        return next;
      });
      toast.error("Impossible de mettre à jour la tâche.", {
        description: error instanceof Error ? error.message : undefined,
      });
    }
  }

  const visibleTasks = tasks.filter((t) => !completedIds.has(t.id));

  if (visibleTasks.length === 0) {
    return (
      <p className="py-6 text-center text-sm text-muted-foreground">
        Aucune tâche prioritaire aujourd&apos;hui — bien joué !
      </p>
    );
  }

  return (
    <ul className="flex flex-col gap-2">
      {visibleTasks.map((task) => (
        <li key={task.id} className="flex items-start gap-2 rounded-lg border p-2.5 text-sm">
          <Checkbox
            className="mt-0.5"
            checked={false}
            onCheckedChange={(checked) => checked && handleComplete(task)}
            aria-label="Marquer comme terminée"
          />
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-2">
              <span className="truncate font-medium">{task.subject}</span>
              <Badge
                variant={
                  task.priority === "HAUTE"
                    ? "destructive"
                    : task.priority === "BASSE"
                      ? "secondary"
                      : "outline"
                }
                className="shrink-0"
              >
                {TASK_PRIORITY_LABELS[task.priority]}
              </Badge>
            </div>
            <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
              <Badge variant="outline" className="font-normal">
                {TASK_TYPE_LABELS[task.type]}
              </Badge>
              {task.company && (
                <Link
                  href={`/companies?id=${task.company.id}`}
                  className="text-primary hover:underline"
                >
                  {task.company.name}
                </Link>
              )}
              {task.contact && (
                <span>
                  {task.contact.firstName} {task.contact.lastName}
                </span>
              )}
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}
