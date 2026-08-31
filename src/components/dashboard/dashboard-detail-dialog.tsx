"use client";

import Link from "next/link";
import type { ComponentProps } from "react";
import { Loader2 } from "lucide-react";

import { formatDate } from "@/lib/labels";
import { AssigneeBadge, type AssigneeLite } from "@/components/assignee/assignee-badge";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export type DashboardDetailItem = {
  id: string;
  title: string;
  amount?: string | null;
  status?: { label: string; variant?: ComponentProps<typeof Badge>["variant"] } | null;
  company?: { id: string; name: string } | null;
  owner: AssigneeLite;
  date: Date | string | null;
  /** Fiche URL — omit for items with no dedicated detail page. */
  href?: string | null;
};

/**
 * Generic click-to-detail dialog for dashboard charts: given a dynamic
 * title and a flat list of items, renders each as a compact card (title,
 * amount, status, company, owner, date), linking to its fiche when `href`
 * is set. Reused by both the pipeline-by-stage chart and the activity
 * trend chart's click handlers.
 */
export function DashboardDetailDialog({
  open,
  onOpenChange,
  title,
  loading = false,
  items,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  loading?: boolean;
  items: DashboardDetailItem[];
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex h-32 items-center justify-center">
            <Loader2 className="size-5 animate-spin text-muted-foreground" />
          </div>
        ) : items.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            Aucun élément pour cette sélection.
          </p>
        ) : (
          <ul className="flex max-h-96 flex-col gap-2 overflow-y-auto">
            {items.map((item) => {
              const card = (
                <div className="flex flex-col gap-1.5 rounded-lg border p-2.5 text-sm transition-colors hover:border-primary hover:bg-primary/5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate font-medium">{item.title}</span>
                    {item.amount && (
                      <span className="shrink-0 font-mono text-xs text-muted-foreground">
                        {item.amount}
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    {item.status && (
                      <Badge variant={item.status.variant ?? "outline"}>{item.status.label}</Badge>
                    )}
                    {item.company && <span className="truncate">{item.company.name}</span>}
                    <AssigneeBadge assignee={item.owner} className="shrink-0" />
                    <span className="ml-auto shrink-0">{formatDate(item.date)}</span>
                  </div>
                </div>
              );

              return (
                <li key={item.id}>
                  {item.href ? (
                    <Link href={item.href} onClick={() => onOpenChange(false)} className="block">
                      {card}
                    </Link>
                  ) : (
                    card
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </DialogContent>
    </Dialog>
  );
}
