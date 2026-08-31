"use client";

import { useEffect, useState } from "react";
import { ChevronDown, ChevronRight, Loader2, Plus } from "lucide-react";
import { toast } from "sonner";

import type { PipelineStage } from "@/generated/prisma/client";
import type { CompanyDetail } from "@/lib/queries/companies";
import { getActivitiesAction } from "@/lib/actions/activities";
import { listPipelineStagesAction, moveDealStageAction } from "@/lib/actions/deals";
import { STAGE_CHANGE_PREFIX, type TimelineEntry } from "@/lib/activity-timeline";
import { formatCurrency, formatDateTime } from "@/lib/labels";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { NewDealDialog } from "@/components/deals/new-deal-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type CompanyDeal = CompanyDetail["deals"][number];

function StageHistory({ dealId }: { dealId: string }) {
  const [entries, setEntries] = useState<TimelineEntry[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    getActivitiesAction({ dealId }).then((result) => {
      if (!cancelled) setEntries(result);
    });
    return () => {
      cancelled = true;
    };
  }, [dealId]);

  if (entries === null) {
    return <Loader2 className="size-3.5 animate-spin text-muted-foreground" />;
  }

  const changes = entries
    .filter(
      (entry): entry is Extract<TimelineEntry, { kind: "activity" }> =>
        entry.kind === "activity" && entry.subject.startsWith(STAGE_CHANGE_PREFIX)
    )
    .map((entry) => {
      const [from, to] = entry.subject.slice(STAGE_CHANGE_PREFIX.length).trim().split(" → ");
      return { id: entry.id, from, to, date: entry.createdAt };
    });

  if (changes.length === 0) {
    return (
      <p className="text-xs text-muted-foreground">Aucun changement d&apos;étape consigné.</p>
    );
  }

  return (
    <ul className="flex flex-col gap-1">
      {changes.map((change) => (
        <li key={change.id} className="text-xs text-muted-foreground">
          <span className="text-foreground">{formatDateTime(change.date)}</span> — {change.from}{" "}
          → {change.to}
        </li>
      ))}
    </ul>
  );
}

function DealRow({
  deal,
  stages,
  onStageChanged,
}: {
  deal: CompanyDeal;
  stages: PipelineStage[] | null;
  onStageChanged: (dealId: string, stage: PipelineStage) => void;
}) {
  const [changing, setChanging] = useState(false);
  const [expanded, setExpanded] = useState(false);

  async function handleStageChange(stageId: string) {
    if (!stageId || stageId === deal.stage.id) return;
    const newStage = stages?.find((s) => s.id === stageId);
    if (!newStage) return;

    const previousStage = deal.stage;
    setChanging(true);
    onStageChanged(deal.id, newStage);
    try {
      await moveDealStageAction(deal.id, stageId);
    } catch (error) {
      onStageChanged(deal.id, previousStage);
      toast.error("Impossible de changer l'étape du deal.", {
        description: error instanceof Error ? error.message : undefined,
      });
    } finally {
      setChanging(false);
    }
  }

  return (
    <li className="rounded-lg border p-2.5 text-sm">
      <div className="flex items-start justify-between gap-2">
        <button
          type="button"
          className="flex min-w-0 items-start gap-1 text-left"
          onClick={() => setExpanded((v) => !v)}
        >
          {expanded ? (
            <ChevronDown className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
          ) : (
            <ChevronRight className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
          )}
          <span className="min-w-0">
            <span className="block truncate font-medium">{deal.name}</span>
            <span className="text-xs text-muted-foreground">{formatCurrency(deal.value)}</span>
          </span>
        </button>
        {changing && <Loader2 className="size-3.5 shrink-0 animate-spin text-muted-foreground" />}
      </div>

      <div className="mt-2 flex items-center gap-1.5">
        <Select
          value={deal.stage.id}
          disabled={changing || !stages}
          onValueChange={(value) => value && handleStageChange(value)}
        >
          <SelectTrigger className="h-7 flex-1">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {(stages ?? [deal.stage]).map((stage) => (
              <SelectItem key={stage.id} value={stage.id}>
                {stage.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {expanded && (
        <div className={cn("mt-2 border-t pt-2")}>
          <p className="mb-1 text-xs font-medium text-muted-foreground">
            Historique des étapes
          </p>
          <StageHistory dealId={deal.id} />
        </div>
      )}
    </li>
  );
}

/**
 * "Deals & Progression" — left-column section of the Company drawer.
 * Distinct from the read-only center "Deals" tab and the right column's
 * compact summary: this one lets you change a deal's stage inline and
 * inspect its stage-change history, without leaving the left column.
 */
export function CompanyDealsPanel({
  companyId,
  contacts,
  deals,
  onStageChanged,
  onDealCreated,
}: {
  companyId: string;
  contacts: { id: string; firstName: string; lastName: string }[];
  deals: CompanyDeal[];
  onStageChanged: (dealId: string, stage: PipelineStage) => void;
  onDealCreated: () => void;
}) {
  const [stages, setStages] = useState<PipelineStage[] | null>(null);
  const [newDealOpen, setNewDealOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    listPipelineStagesAction().then((result) => {
      if (!cancelled) setStages(result);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <h4 className="text-sm font-medium">Deals &amp; Progression</h4>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-7 px-2 text-xs text-primary"
          onClick={() => setNewDealOpen(true)}
        >
          <Plus className="size-3.5" /> Nouveau deal
        </Button>
      </div>

      {deals.length === 0 ? (
        <p className="text-sm text-muted-foreground">Aucun deal en cours.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {deals.map((deal) => (
            <DealRow key={deal.id} deal={deal} stages={stages} onStageChanged={onStageChanged} />
          ))}
        </ul>
      )}

      {stages && (
        <NewDealDialog
          open={newDealOpen}
          onOpenChange={setNewDealOpen}
          stages={stages}
          fixedCompanyId={companyId}
          contacts={contacts}
          onCreated={() => {
            setNewDealOpen(false);
            onDealCreated();
          }}
        />
      )}
    </div>
  );
}
