"use client";

import { useMemo, useState } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { Plus } from "lucide-react";
import { toast } from "sonner";

import type { PipelineStage } from "@/generated/prisma/client";
import type { CompanyOption } from "@/lib/queries/companies";
import type { BoardDeal } from "@/lib/queries/deals";
import { moveDealStageAction } from "@/lib/actions/deals";
import { Button } from "@/components/ui/button";
import { DealCard } from "@/components/deals/deal-card";
import { DealDetailSheet } from "@/components/deals/deal-detail-sheet";
import { KanbanColumn } from "@/components/deals/kanban-column";
import { NewDealDialog } from "@/components/deals/new-deal-dialog";

export function KanbanBoard({
  stages,
  deals: initialDeals,
  companies,
}: {
  stages: PipelineStage[];
  deals: BoardDeal[];
  companies: CompanyOption[];
}) {
  const [deals, setDeals] = useState(initialDeals);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [selectedDealId, setSelectedDealId] = useState<string | null>(null);
  const [newDealDialog, setNewDealDialog] = useState<{
    open: boolean;
    stageId?: string;
  }>({ open: false });

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 6 },
    })
  );

  const dealsByStage = useMemo(() => {
    const map = new Map<string, BoardDeal[]>();
    for (const stage of stages) map.set(stage.id, []);
    for (const deal of deals) {
      map.get(deal.stageId)?.push(deal);
    }
    return map;
  }, [stages, deals]);

  const activeDeal = activeId ? deals.find((d) => d.id === activeId) : null;

  function handleDragStart(event: DragStartEvent) {
    setActiveId(String(event.active.id));
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveId(null);
    const { active, over } = event;
    if (!over) return;

    const dealId = String(active.id);
    const targetStageId = String(over.id);
    const deal = deals.find((d) => d.id === dealId);
    if (!deal || deal.stageId === targetStageId) return;

    const previousStageId = deal.stageId;
    const targetStage = stages.find((s) => s.id === targetStageId);

    // Optimistic update
    setDeals((prev) =>
      prev.map((d) =>
        d.id === dealId
          ? {
              ...d,
              stageId: targetStageId,
              closedAt: targetStage?.isWon || targetStage?.isLost ? new Date() : null,
            }
          : d
      )
    );

    moveDealStageAction(dealId, targetStageId).catch((error) => {
      // Revert on failure
      setDeals((prev) =>
        prev.map((d) => (d.id === dealId ? { ...d, stageId: previousStageId } : d))
      );
      toast.error("Impossible de déplacer le deal.", {
        description: error instanceof Error ? error.message : undefined,
      });
    });
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex shrink-0 justify-end px-4 pt-3">
        <Button
          size="sm"
          onClick={() => setNewDealDialog({ open: true, stageId: undefined })}
        >
          <Plus />
          Nouveau Deal
        </Button>
      </div>

      <DndContext
        sensors={sensors}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="flex min-h-0 flex-1 gap-3 overflow-x-auto p-4">
          {stages.map((stage) => (
            <KanbanColumn
              key={stage.id}
              stage={stage}
              deals={dealsByStage.get(stage.id) ?? []}
              onOpenDeal={setSelectedDealId}
              onAddDeal={(stageId) => setNewDealDialog({ open: true, stageId })}
            />
          ))}
        </div>

        <DragOverlay>
          {activeDeal ? (
            <div className="w-72 rotate-2 opacity-90">
              <DealCard deal={activeDeal} onOpen={() => {}} />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      <DealDetailSheet
        dealId={selectedDealId}
        onOpenChange={(open) => !open && setSelectedDealId(null)}
      />

      <NewDealDialog
        open={newDealDialog.open}
        onOpenChange={(open) => setNewDealDialog((prev) => ({ ...prev, open }))}
        stages={stages}
        companies={companies}
        defaultStageId={newDealDialog.stageId}
        onCreated={(deal) => setDeals((prev) => [deal, ...prev])}
      />
    </div>
  );
}
