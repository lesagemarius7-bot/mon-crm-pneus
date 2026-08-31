"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AlertCircle, Columns3, Loader2, Table2 } from "lucide-react";
import { toast } from "sonner";

import type { CompanyOption } from "@/lib/queries/companies";
import type { DealOption } from "@/lib/queries/deals";
import type { DueFilter, TaskRow } from "@/lib/queries/tasks";
import { listTasksAction, toggleTaskStatusAction } from "@/lib/actions/tasks";
import {
  TASK_PRIORITY_LABELS,
  TASK_STATUS_LABELS,
  TASK_TYPE_LABELS,
  formatDate,
} from "@/lib/labels";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TaskFormDialog } from "@/components/tasks/task-form-dialog";
import { TaskKanbanBoard } from "@/components/tasks/task-kanban-board";

type ViewMode = "table" | "kanban";

const DUE_FILTERS: { value: DueFilter; label: string }[] = [
  { value: "ALL", label: "Toutes" },
  { value: "OVERDUE", label: "En retard" },
  { value: "TODAY", label: "Aujourd'hui" },
  { value: "TOMORROW", label: "Demain" },
  { value: "3_DAYS", label: "À 3 jours" },
  { value: "1_MONTH", label: "Dans 1 mois" },
  { value: "6_MONTHS", label: "Dans 6 mois" },
];

const ALL_STATUSES = "all";
const ALL_TYPES = "all";

function dueDateClassName(task: TaskRow): string {
  if (!task.dueDate || task.status === "TERMINEE") return "text-muted-foreground";
  const now = new Date();
  const due = new Date(task.dueDate);
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (due < startOfToday) return "text-destructive font-medium";
  if (due.toDateString() === now.toDateString()) return "text-amber-600 font-medium";
  return "text-muted-foreground";
}

export function TasksView({
  companies,
  deals,
}: {
  companies: CompanyOption[];
  deals: DealOption[];
}) {
  const [view, setView] = useState<ViewMode>("table");
  const [dueFilter, setDueFilter] = useState<DueFilter>("ALL");
  const [statusFilter, setStatusFilter] = useState(ALL_STATUSES);
  const [typeFilter, setTypeFilter] = useState(ALL_TYPES);
  const [tasks, setTasks] = useState<TaskRow[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    listTasksAction({
      dueFilter,
      status: statusFilter === ALL_STATUSES ? undefined : (statusFilter as TaskRow["status"]),
      type: typeFilter === ALL_TYPES ? undefined : (typeFilter as TaskRow["type"]),
    }).then((result) => {
      if (!cancelled) setTasks(result);
    });
    return () => {
      cancelled = true;
    };
  }, [dueFilter, statusFilter, typeFilter]);

  function refresh() {
    listTasksAction({
      dueFilter,
      status: statusFilter === ALL_STATUSES ? undefined : (statusFilter as TaskRow["status"]),
      type: typeFilter === ALL_TYPES ? undefined : (typeFilter as TaskRow["type"]),
    }).then(setTasks);
  }

  async function handleToggle(task: TaskRow, checked: boolean) {
    const nextStatus = checked ? "TERMINEE" : "A_FAIRE";
    setTasks((prev) =>
      prev
        ? prev.map((t) => (t.id === task.id ? { ...t, status: nextStatus } : t))
        : prev
    );
    try {
      await toggleTaskStatusAction(task.id, nextStatus);
    } catch (error) {
      toast.error("Impossible de mettre à jour la tâche.", {
        description: error instanceof Error ? error.message : undefined,
      });
      refresh();
    }
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex shrink-0 flex-col gap-3 border-b p-3">
        <div className="flex items-start justify-between gap-3">
          <div className="overflow-x-auto">
            {view === "table" ? (
              <Tabs
                value={dueFilter}
                onValueChange={(v) => setDueFilter((v as DueFilter) ?? "ALL")}
              >
                <TabsList>
                  {DUE_FILTERS.map((f) => (
                    <TabsTrigger key={f.value} value={f.value}>
                      {f.label}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </Tabs>
            ) : (
              <p className="text-sm text-muted-foreground">
                Les colonnes reflètent l&apos;échéance et le statut des tâches.
              </p>
            )}
          </div>

          <div className="flex shrink-0 items-center gap-1 rounded-md border p-0.5">
            <Button
              type="button"
              variant={view === "table" ? "secondary" : "ghost"}
              size="sm"
              className="h-7 gap-1.5 px-2"
              onClick={() => setView("table")}
            >
              <Table2 className="size-3.5" />
              Table
            </Button>
            <Button
              type="button"
              variant={view === "kanban" ? "secondary" : "ghost"}
              size="sm"
              className="h-7 gap-1.5 px-2"
              onClick={() => setView("kanban")}
            >
              <Columns3 className="size-3.5" />
              Kanban
            </Button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {view === "table" && (
            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v ?? ALL_STATUSES)}>
              <SelectTrigger className="h-8 w-40">
                <SelectValue placeholder="Statut" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_STATUSES}>Tous les statuts</SelectItem>
                {Object.entries(TASK_STATUS_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v ?? ALL_TYPES)}>
            <SelectTrigger className="h-8 w-44">
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_TYPES}>Tous les types</SelectItem>
              {Object.entries(TASK_TYPE_LABELS).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {view === "table" && (
            <span className="text-sm text-muted-foreground">
              {tasks ? `${tasks.length} tâche${tasks.length > 1 ? "s" : ""}` : ""}
            </span>
          )}

          <div className="ml-auto">
            <TaskFormDialog companies={companies} deals={deals} onCreated={refresh} />
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        {view === "kanban" ? (
          <TaskKanbanBoard typeFilter={typeFilter === ALL_TYPES ? undefined : typeFilter} />
        ) : tasks === null ? (
          <div className="flex h-full items-center justify-center">
            <Loader2 className="size-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <Table>
            <TableHeader className="sticky top-0 z-10 bg-background">
              <TableRow>
                <TableHead className="w-10" />
                <TableHead>Sujet</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Échéance</TableHead>
                <TableHead>Priorité</TableHead>
                <TableHead>Entreprise / Contact</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tasks.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                    Aucune tâche ne correspond à ces filtres.
                  </TableCell>
                </TableRow>
              ) : (
                tasks.map((task) => (
                  <TableRow key={task.id}>
                    <TableCell>
                      <Checkbox
                        checked={task.status === "TERMINEE"}
                        onCheckedChange={(checked) => handleToggle(task, !!checked)}
                        aria-label="Marquer comme terminée"
                      />
                    </TableCell>
                    <TableCell>
                      <p
                        className={cn(
                          "font-medium",
                          task.status === "TERMINEE" && "text-muted-foreground line-through"
                        )}
                      >
                        {task.subject}
                      </p>
                      {task.reason && (
                        <p className="text-xs text-muted-foreground">{task.reason}</p>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{TASK_TYPE_LABELS[task.type]}</Badge>
                    </TableCell>
                    <TableCell className={dueDateClassName(task)}>
                      <span className="inline-flex items-center gap-1">
                        {dueDateClassName(task).includes("destructive") && (
                          <AlertCircle className="size-3.5" />
                        )}
                        {formatDate(task.dueDate)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          task.priority === "HAUTE"
                            ? "destructive"
                            : task.priority === "BASSE"
                              ? "secondary"
                              : "outline"
                        }
                      >
                        {TASK_PRIORITY_LABELS[task.priority]}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col text-sm">
                        {task.company && (
                          <Link
                            href={`/companies?id=${task.company.id}`}
                            className="text-primary hover:underline"
                          >
                            {task.company.name}
                          </Link>
                        )}
                        {task.contact && (
                          <span className="text-xs text-muted-foreground">
                            {task.contact.firstName} {task.contact.lastName}
                          </span>
                        )}
                        {!task.company && !task.contact && (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}
