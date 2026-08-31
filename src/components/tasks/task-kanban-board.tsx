"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import type { TaskRow } from "@/lib/queries/tasks";
import { listTasksAction, toggleTaskStatusAction, updateTaskAction } from "@/lib/actions/tasks";
import { getBucketDropPayload, getTaskBucket, TASK_BUCKETS, type TaskBucket } from "@/lib/task-buckets";
import { useRealtimeSync, type RealtimeTable } from "@/hooks/use-realtime-sync";
import { TaskKanbanCard } from "@/components/tasks/task-kanban-card";
import { TaskKanbanColumn } from "@/components/tasks/task-kanban-column";

// Module-level so useRealtimeSync always receives a stable array reference.
const REALTIME_TABLES: RealtimeTable[] = ["tasks"];

export function TaskKanbanBoard({ typeFilter }: { typeFilter?: string }) {
  const [tasks, setTasks] = useState<TaskRow[] | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } })
  );

  // A realtime "tasks" change — including the echo of this tab's own
  // drag-and-drop write — must not replace the whole board mid-drag: that
  // would swap out the DOM nodes dnd-kit is actively tracking out from
  // under the gesture. Read via a ref (not a `refresh` dependency) so the
  // realtime subscription itself doesn't need to reset.
  const activeIdRef = useRef<string | null>(null);
  useEffect(() => {
    activeIdRef.current = activeId;
  }, [activeId]);

  const refresh = useCallback(() => {
    if (activeIdRef.current) return;
    listTasksAction({ dueFilter: "ALL", type: typeFilter as TaskRow["type"] | undefined }).then(
      setTasks
    );
  }, [typeFilter]);

  useEffect(() => {
    let cancelled = false;
    listTasksAction({ dueFilter: "ALL", type: typeFilter as TaskRow["type"] | undefined }).then(
      (result) => {
        if (!cancelled) setTasks(result);
      }
    );
    return () => {
      cancelled = true;
    };
  }, [typeFilter]);

  useRealtimeSync(REALTIME_TABLES, refresh);

  const tasksByBucket = useMemo(() => {
    const map = new Map<TaskBucket, TaskRow[]>(
      TASK_BUCKETS.map((b) => [b.id, [] as TaskRow[]])
    );
    for (const task of tasks ?? []) {
      map.get(getTaskBucket(task))?.push(task);
    }
    return map;
  }, [tasks]);

  const activeTask = activeId ? (tasks ?? []).find((t) => t.id === activeId) : null;

  async function handleToggleDone(task: TaskRow, checked: boolean) {
    const nextStatus = checked ? "TERMINEE" : "A_FAIRE";
    setTasks((prev) =>
      prev ? prev.map((t) => (t.id === task.id ? { ...t, status: nextStatus } : t)) : prev
    );
    try {
      await toggleTaskStatusAction(task.id, nextStatus);
    } catch (error) {
      toast.error("Impossible de mettre à jour la tâche.", {
        description: error instanceof Error ? error.message : undefined,
      });
      setTasks((prev) =>
        prev ? prev.map((t) => (t.id === task.id ? { ...t, status: task.status } : t)) : prev
      );
    }
  }

  function handleDragStart(event: DragStartEvent) {
    setActiveId(String(event.active.id));
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveId(null);
    const { active, over } = event;
    if (!over) return;

    const taskId = String(active.id);
    const targetBucket = String(over.id) as TaskBucket;
    const task = (tasks ?? []).find((t) => t.id === taskId);
    if (!task || getTaskBucket(task) === targetBucket) return;

    const previous = { dueDate: task.dueDate, status: task.status };
    const payload = getBucketDropPayload(targetBucket);

    // Optimistic update
    setTasks((prev) =>
      prev
        ? prev.map((t) =>
            t.id === taskId
              ? {
                  ...t,
                  dueDate: payload.dueDate !== undefined ? payload.dueDate : t.dueDate,
                  status: payload.status ?? t.status,
                }
              : t
          )
        : prev
    );

    updateTaskAction(taskId, payload).catch((error) => {
      setTasks((prev) =>
        prev ? prev.map((t) => (t.id === taskId ? { ...t, ...previous } : t)) : prev
      );
      toast.error("Impossible de déplacer la tâche.", {
        description: error instanceof Error ? error.message : undefined,
      });
    });
  }

  if (tasks === null) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="size-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    // Self-contained height (flex-col root + flex-1/min-h-0 row), mirroring
    // the Deals KanbanBoard — needed because this component's own h-full
    // used to sit directly on the DndContext's row div, which depended on
    // its parent (a plain block, not a flex container) to hand down a
    // definite height. That's fragile; owning the height chain here
    // instead is what actually makes columns/cards render and stay
    // draggable regardless of how the parent view wraps this component.
    <div className="flex h-full flex-col">
      <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div className="flex min-h-0 flex-1 gap-3 overflow-x-auto p-4">
          {TASK_BUCKETS.map((bucket) => (
            <TaskKanbanColumn
              key={bucket.id}
              bucket={bucket.id}
              label={bucket.label}
              tasks={tasksByBucket.get(bucket.id) ?? []}
              onToggleDone={handleToggleDone}
            />
          ))}
        </div>

        <DragOverlay>
          {activeTask ? (
            <div className="w-72 rotate-2 opacity-90">
              <TaskKanbanCard task={activeTask} onToggleDone={() => {}} />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}
