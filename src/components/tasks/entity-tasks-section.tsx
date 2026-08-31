"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import type { TaskRow } from "@/lib/queries/tasks";
import { listTasksAction, toggleTaskStatusAction } from "@/lib/actions/tasks";
import { TASK_TYPE_LABELS, formatDate } from "@/lib/labels";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { TaskFormDialog } from "@/components/tasks/task-form-dialog";

/**
 * "Tâches à venir" — open tasks scoped to one company/contact/deal, kept
 * deliberately separate from ActivityTimeline's past-tense history (Notes
 * + Activities). Self-fetches so it can live inside any drawer/dialog
 * without the parent having to thread task data through.
 */
export function EntityTasksSection({
  companyId,
  contactId,
  dealId,
}: {
  companyId?: string;
  contactId?: string;
  dealId?: string;
}) {
  const [tasks, setTasks] = useState<TaskRow[] | null>(null);

  const refresh = useCallback(() => {
    listTasksAction({ companyId, contactId, dealId, status: "A_FAIRE" }).then(
      setTasks
    );
  }, [companyId, contactId, dealId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  async function handleComplete(task: TaskRow) {
    setTasks((prev) => (prev ? prev.filter((t) => t.id !== task.id) : prev));
    try {
      await toggleTaskStatusAction(task.id, "TERMINEE");
    } catch (error) {
      toast.error("Impossible de mettre à jour la tâche.", {
        description: error instanceof Error ? error.message : undefined,
      });
      refresh();
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium">
          Tâches à venir{tasks ? ` (${tasks.length})` : ""}
        </h4>
        <TaskFormDialog
          companyId={companyId}
          contactId={contactId}
          dealId={dealId}
          onCreated={refresh}
          trigger={
            <button
              type="button"
              className="text-xs text-primary hover:underline"
            >
              + Tâche
            </button>
          }
        />
      </div>

      {tasks === null ? (
        <Loader2 className="size-4 animate-spin text-muted-foreground" />
      ) : tasks.length === 0 ? (
        <p className="text-sm text-muted-foreground">Aucune tâche à venir.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {tasks.map((task) => (
            <li
              key={task.id}
              className="flex items-start gap-2 rounded-lg border p-2.5 text-sm"
            >
              <Checkbox
                className="mt-0.5"
                checked={false}
                onCheckedChange={(checked) => checked && handleComplete(task)}
                aria-label="Marquer comme terminée"
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate font-medium">{task.subject}</span>
                  <Badge variant="outline" className="shrink-0">
                    {TASK_TYPE_LABELS[task.type]}
                  </Badge>
                </div>
                {task.reason && (
                  <p className="text-xs text-muted-foreground">{task.reason}</p>
                )}
                {task.dueDate && (
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Échéance : {formatDate(task.dueDate)}
                  </p>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
