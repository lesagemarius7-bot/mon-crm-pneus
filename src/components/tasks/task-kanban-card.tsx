"use client";

import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { Building2, GripVertical, User } from "lucide-react";

import type { TaskRow } from "@/lib/queries/tasks";
import { TASK_PRIORITY_LABELS, TASK_TYPE_LABELS, formatDate } from "@/lib/labels";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";

export function TaskKanbanCard({
  task,
  onToggleDone,
}: {
  task: TaskRow;
  onToggleDone: (checked: boolean) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: task.id,
  });

  const style = transform ? { transform: CSS.Translate.toString(transform) } : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "group rounded-lg border bg-card p-3 text-sm shadow-sm transition-shadow hover:shadow-md",
        isDragging && "opacity-40"
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-2">
          <Checkbox
            className="mt-0.5"
            checked={task.status === "TERMINEE"}
            onCheckedChange={(checked) => onToggleDone(!!checked)}
            aria-label="Marquer comme terminée"
          />
          <p
            className={cn(
              "font-medium leading-tight",
              task.status === "TERMINEE" && "text-muted-foreground line-through"
            )}
          >
            {task.subject}
          </p>
        </div>
        <button
          type="button"
          {...attributes}
          {...listeners}
          className="-mt-1 -mr-1 shrink-0 cursor-grab touch-none rounded p-1 text-muted-foreground opacity-0 hover:bg-muted group-hover:opacity-100 active:cursor-grabbing"
          aria-label="Déplacer"
        >
          <GripVertical className="size-3.5" />
        </button>
      </div>

      {task.reason && (
        <p className="mt-1 pl-6 text-xs text-muted-foreground">{task.reason}</p>
      )}

      <div className="mt-2 flex flex-wrap items-center gap-1.5 pl-6">
        <Badge variant="outline">{TASK_TYPE_LABELS[task.type] ?? task.type}</Badge>
        <Badge
          variant={
            task.priority === "HAUTE"
              ? "destructive"
              : task.priority === "BASSE"
                ? "secondary"
                : "outline"
          }
        >
          {TASK_PRIORITY_LABELS[task.priority] ?? task.priority}
        </Badge>
      </div>

      {(task.company || task.contact) && (
        <div className="mt-2 space-y-0.5 pl-6 text-xs text-muted-foreground">
          {task.company?.name && (
            <div className="flex items-center gap-1.5">
              <Building2 className="size-3.5 shrink-0" />
              <span className="truncate">{task.company.name}</span>
            </div>
          )}
          {task.contact && (task.contact.firstName || task.contact.lastName) && (
            <div className="flex items-center gap-1.5">
              <User className="size-3.5 shrink-0" />
              <span className="truncate">
                {task.contact.firstName} {task.contact.lastName}
              </span>
            </div>
          )}
        </div>
      )}

      {task.dueDate && (
        <p className="mt-2 pl-6 text-xs text-muted-foreground">
          Échéance : {formatDate(task.dueDate)}
        </p>
      )}
    </div>
  );
}
