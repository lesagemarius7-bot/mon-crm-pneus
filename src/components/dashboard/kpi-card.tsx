import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";

export function KpiCard({
  icon: Icon,
  label,
  value,
  subValue,
  accent = false,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  /** Secondary line under the value — e.g. "3 en retard" or "12 ce mois-ci". */
  subValue?: string;
  /** Highlights the sub-value in the destructive color (e.g. overdue count). */
  accent?: boolean;
}) {
  return (
    <Card className="gap-2 py-4">
      <CardContent className="flex items-start justify-between gap-3 px-4">
        <div className="min-w-0">
          <p className="text-xs font-medium text-muted-foreground">{label}</p>
          <p className="mt-1 truncate text-2xl font-semibold">{value}</p>
          {subValue && (
            <p
              className={cn(
                "mt-0.5 text-xs text-muted-foreground",
                accent && "font-medium text-destructive"
              )}
            >
              {subValue}
            </p>
          )}
        </div>
        <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Icon className="size-4.5" />
        </div>
      </CardContent>
    </Card>
  );
}
