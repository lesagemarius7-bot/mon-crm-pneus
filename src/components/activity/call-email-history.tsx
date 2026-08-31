"use client";

import { useEffect, useState } from "react";
import { CalendarDays, Loader2, Mail, Phone } from "lucide-react";

import type { TimelineEntry } from "@/lib/activity-timeline";
import { getActivitiesAction } from "@/lib/actions/activities";
import { formatDateTime } from "@/lib/labels";
import { cn } from "@/lib/utils";

type ActivityEntry = Extract<TimelineEntry, { kind: "activity" }>;

const RELEVANT_TYPES = new Set(["APPEL", "EMAIL", "RENDEZ_VOUS"]);

function iconFor(entry: ActivityEntry) {
  switch (entry.activityType) {
    case "APPEL":
      return { Icon: Phone, className: "bg-blue-500/15 text-blue-600" };
    case "EMAIL":
      return { Icon: Mail, className: "bg-sky-500/15 text-sky-600" };
    case "RENDEZ_VOUS":
      return { Icon: CalendarDays, className: "bg-emerald-500/15 text-emerald-600" };
    default:
      return { Icon: Phone, className: "bg-muted text-muted-foreground" };
  }
}

/**
 * Read-only "Historique Mails & Appels" — a filtered slice of the same
 * notes+activities feed as ActivityTimeline, restricted to APPEL/EMAIL/
 * RENDEZ_VOUS entries. Notes and quick logging stay in "Activités & Notes".
 */
export function CallEmailHistory({
  companyId,
  dealId,
}: {
  companyId?: string;
  dealId?: string;
}) {
  const [entries, setEntries] = useState<TimelineEntry[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    getActivitiesAction({ companyId, dealId }).then((result) => {
      if (!cancelled) setEntries(result);
    });
    return () => {
      cancelled = true;
    };
  }, [companyId, dealId]);

  if (entries === null) {
    return <Loader2 className="size-4 animate-spin text-muted-foreground" />;
  }

  const filtered = entries.filter(
    (entry): entry is ActivityEntry =>
      entry.kind === "activity" && RELEVANT_TYPES.has(entry.activityType)
  );

  if (filtered.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Aucun appel ni email consigné pour le moment.
      </p>
    );
  }

  return (
    <ul className="flex flex-col gap-3">
      {filtered.map((entry) => {
        const { Icon, className } = iconFor(entry);
        return (
          <li key={entry.id} className="flex gap-3">
            <div
              className={cn(
                "mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full",
                className
              )}
            >
              <Icon className="size-3.5" />
            </div>
            <div className="min-w-0 flex-1 border-b pb-3">
              <p className="text-sm font-medium">{entry.subject}</p>
              {entry.description && (
                <p className="mt-0.5 whitespace-pre-wrap text-sm text-muted-foreground">
                  {entry.description}
                </p>
              )}
              <p className="mt-1 text-xs text-muted-foreground">
                {formatDateTime(entry.createdAt)}
              </p>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
