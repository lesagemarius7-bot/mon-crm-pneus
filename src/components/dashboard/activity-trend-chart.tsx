"use client";

import { useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import {
  listCompletedTasksForDateAction,
  listEmailActivitiesForDateAction,
} from "@/lib/actions/dashboard";
import {
  DashboardDetailDialog,
  type DashboardDetailItem,
} from "@/components/dashboard/dashboard-detail-dialog";

const BRAND_YELLOW = "#F5BD02";
const BRAND_NAVY = "#1E3A8A";

export type ActivityTrendDatum = { date: string; emails: number; tasks: number };

function formatShortDate(value: string): string {
  const date = new Date(`${value}T00:00:00`);
  return date.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" });
}

function formatLongDate(value: string): string {
  const date = new Date(`${value}T00:00:00`);
  return date.toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" });
}

export function ActivityTrendChart({ data }: { data: ActivityTrendDatum[] }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [title, setTitle] = useState("");
  const [items, setItems] = useState<DashboardDetailItem[]>([]);

  const hasActivity = data.some((d) => d.emails > 0 || d.tasks > 0);

  async function handlePointClick(dateKeyValue: string) {
    const datum = data.find((d) => d.date === dateKeyValue);
    if (!datum || (datum.emails === 0 && datum.tasks === 0)) return;

    setOpen(true);
    setLoading(true);
    setTitle(
      `${datum.emails} email${datum.emails > 1 ? "s" : ""} et ${datum.tasks} tâche${datum.tasks > 1 ? "s" : ""} — ${formatLongDate(dateKeyValue)}`
    );

    const [emails, tasks] = await Promise.all([
      listEmailActivitiesForDateAction(dateKeyValue),
      listCompletedTasksForDateAction(dateKeyValue),
    ]);

    const emailItems: DashboardDetailItem[] = emails.map((activity) => ({
      id: `email-${activity.id}`,
      title: activity.subject,
      status: { label: "Email", variant: "outline" },
      company: activity.company,
      owner: activity.owner,
      date: activity.createdAt,
      href: activity.company
        ? `/companies?id=${activity.company.id}`
        : activity.deal
          ? `/deals?deal=${activity.deal.id}`
          : null,
    }));

    const taskItems: DashboardDetailItem[] = tasks.map((task) => ({
      id: `task-${task.id}`,
      title: task.subject,
      status: { label: "Tâche terminée", variant: "secondary" },
      company: task.company,
      owner: task.owner,
      date: task.completedAt,
      href: "/tasks",
    }));

    setItems([...emailItems, ...taskItems]);
    setLoading(false);
  }

  if (!hasActivity) {
    return (
      <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">
        Aucune activité consignée sur les 30 derniers jours.
      </div>
    );
  }

  return (
    <>
      <ResponsiveContainer width="100%" height={260}>
        <AreaChart
          data={data}
          margin={{ top: 8, right: 8, left: 8, bottom: 8 }}
          className="cursor-pointer"
          onClick={(state) => {
            if (state.activeLabel !== undefined) handlePointClick(String(state.activeLabel));
          }}
        >
          <defs>
            <linearGradient id="fillEmails" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={BRAND_YELLOW} stopOpacity={0.35} />
              <stop offset="95%" stopColor={BRAND_YELLOW} stopOpacity={0.02} />
            </linearGradient>
            <linearGradient id="fillTasks" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={BRAND_NAVY} stopOpacity={0.3} />
              <stop offset="95%" stopColor={BRAND_NAVY} stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
          <XAxis
            dataKey="date"
            tickFormatter={formatShortDate}
            tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
            tickLine={false}
            axisLine={{ stroke: "var(--border)" }}
            minTickGap={24}
          />
          <YAxis
            tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
            tickLine={false}
            axisLine={false}
            width={32}
            allowDecimals={false}
          />
          <Tooltip
            labelFormatter={(value) => (typeof value === "string" ? formatShortDate(value) : value)}
            contentStyle={{
              fontSize: 12,
              borderRadius: 8,
              border: "1px solid var(--border)",
              background: "var(--popover)",
              color: "var(--popover-foreground)",
            }}
          />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Area
            type="monotone"
            dataKey="emails"
            name="Emails envoyés"
            stroke={BRAND_YELLOW}
            strokeWidth={2}
            fill="url(#fillEmails)"
          />
          <Area
            type="monotone"
            dataKey="tasks"
            name="Tâches exécutées"
            stroke={BRAND_NAVY}
            strokeWidth={2}
            fill="url(#fillTasks)"
          />
        </AreaChart>
      </ResponsiveContainer>

      <DashboardDetailDialog
        open={open}
        onOpenChange={setOpen}
        title={title}
        loading={loading}
        items={items}
      />
    </>
  );
}
