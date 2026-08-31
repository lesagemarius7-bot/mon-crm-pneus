"use client";

import { useDroppable } from "@dnd-kit/core";

import type { TaskRow } from "@/lib/queries/tasks";
import type { TaskBucket } from "@/lib/task-buckets";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { TaskKanbanCard } from "@/components/tasks/task-kanban-card";

export function TaskKanbanColumn({
  bucket,
  label,
  tasks,
  onToggleDone,
}: {
  bucket: TaskBucket;
  label: string;
  tasks: TaskRow[];
  onToggleDone: (task: TaskRow, checked: boolean) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: bucket });

  return (
    <div className="flex h-full w-72 shrink-0 flex-col rounded-lg border bg-muted/20">
      <div className="flex shrink-0 items-center justify-between gap-2 border-b p-3">
        <h3 className="truncate text-sm font-medium">{label}</h3>
        <Badge variant="secondary" className="shrink-0">
          {tasks.length}
        </Badge>
      </div>

      <div
        ref={setNodeRef}
        className={cn(
          "flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto p-2 transition-colors",
          isOver && "bg-primary/5"
        )}
      >
        {tasks.length === 0 ? (
          <p className="p-3 text-center text-xs text-muted-foreground">
            Aucune tâche
          </p>
        ) : (
          tasks.map((task) => (
            <TaskKanbanCard
              key={task.id}
              task={task}
              onToggleDone={(checked) => onToggleDone(task, checked)}
            />
          ))
        )}
      </div>
    </div>
  );
}
