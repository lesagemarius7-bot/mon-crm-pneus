"use client";

import { useDroppable } from "@dnd-kit/core";
import { Plus } from "lucide-react";

import type { BoardDeal } from "@/lib/queries/deals";
import type { PipelineStage } from "@/generated/prisma/client";
import { formatCurrency } from "@/lib/labels";
import { DealCard } from "@/components/deals/deal-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function KanbanColumn({
  stage,
  deals,
  onOpenDeal,
  onAddDeal,
}: {
  stage: PipelineStage;
  deals: BoardDeal[];
  onOpenDeal: (id: string) => void;
  onAddDeal: (stageId: string) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: stage.id });
  const totalValue = deals.reduce((sum, deal) => sum + (deal.value ?? 0), 0);

  return (
    <div className="flex h-full w-72 shrink-0 flex-col rounded-lg border border-t-2 border-t-primary bg-muted/20">
      <div className="shrink-0 space-y-1 border-b p-3">
        <div className="flex items-center justify-between gap-2">
          <h3 className="truncate text-sm font-medium">{stage.name}</h3>
          <div className="flex shrink-0 items-center gap-1">
            <Badge variant="secondary">{deals.length}</Badge>
            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              onClick={() => onAddDeal(stage.id)}
              aria-label={`Nouveau deal dans ${stage.name}`}
            >
              <Plus />
            </Button>
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          {formatCurrency(totalValue)}
        </p>
      </div>

      <div
        ref={setNodeRef}
        className={cn(
          "flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto p-2 transition-colors",
          isOver && "bg-primary/5"
        )}
      >
        {deals.length === 0 ? (
          <p className="p-3 text-center text-xs text-muted-foreground">
            Aucun deal
          </p>
        ) : (
          deals.map((deal) => (
            <DealCard key={deal.id} deal={deal} onOpen={onOpenDeal} />
          ))
        )}
      </div>
    </div>
  );
}
