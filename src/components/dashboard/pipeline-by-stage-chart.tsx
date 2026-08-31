"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { formatCurrency } from "@/lib/labels";

const BRAND_YELLOW = "#F5BD02";
const BRAND_NAVY = "#1E3A8A";
const NEUTRAL_GRAY = "#A1A1AA";

export type PipelineStageDatum = {
  name: string;
  total: number;
  count: number;
  isWon: boolean;
  isLost: boolean;
};

function barColor(entry: PipelineStageDatum): string {
  if (entry.isWon) return BRAND_NAVY;
  if (entry.isLost) return NEUTRAL_GRAY;
  return BRAND_YELLOW;
}

export function PipelineByStageChart({ data }: { data: PipelineStageDatum[] }) {
  if (data.every((d) => d.total === 0)) {
    return (
      <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">
        Aucun deal pour le moment.
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
        <XAxis
          dataKey="name"
          tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
          tickLine={false}
          axisLine={{ stroke: "var(--border)" }}
          interval={0}
          angle={-15}
          textAnchor="end"
          height={50}
        />
        <YAxis
          tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
          tickLine={false}
          axisLine={false}
          width={64}
          tickFormatter={(value: number) => formatCurrency(value)}
        />
        <Tooltip
          cursor={{ fill: "var(--muted)" }}
          contentStyle={{
            fontSize: 12,
            borderRadius: 8,
            border: "1px solid var(--border)",
            background: "var(--popover)",
            color: "var(--popover-foreground)",
          }}
          formatter={(value, _name, item) => [
            formatCurrency(typeof value === "number" ? value : Number(value ?? 0)),
            `${item.payload.count} deal${item.payload.count > 1 ? "s" : ""}`,
          ]}
        />
        <Bar dataKey="total" radius={[4, 4, 0, 0]} maxBarSize={48}>
          {data.map((entry) => (
            <Cell key={entry.name} fill={barColor(entry)} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
