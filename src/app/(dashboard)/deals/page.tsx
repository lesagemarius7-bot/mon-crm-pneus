import { getCurrentUserId } from "@/lib/auth";
import { listCompanyOptions } from "@/lib/queries/companies";
import { listDealsForBoard, listPipelineStages } from "@/lib/queries/deals";
import { formatCurrency } from "@/lib/labels";
import { KanbanBoard } from "@/components/deals/kanban-board";

export default async function DealsPage() {
  const [stages, deals, companies, currentUserId] = await Promise.all([
    listPipelineStages(),
    listDealsForBoard(),
    listCompanyOptions(),
    getCurrentUserId(),
  ]);

  const openTotal = deals
    .filter((deal) => {
      const stage = stages.find((s) => s.id === deal.stageId);
      return stage && !stage.isWon && !stage.isLost;
    })
    .reduce((sum, deal) => sum + (deal.value ?? 0), 0);

  return (
    <div className="flex h-full flex-col">
      <div className="flex shrink-0 items-center justify-between border-b px-4 py-3">
        <div>
          <h1 className="font-semibold">Deals</h1>
          <p className="text-sm text-muted-foreground">
            {deals.length} deal{deals.length > 1 ? "s" : ""} · Pipeline ouvert :{" "}
            {formatCurrency(openTotal)}
          </p>
        </div>
      </div>
      <div className="min-h-0 flex-1">
        <KanbanBoard
          stages={stages}
          deals={deals}
          companies={companies}
          currentUserId={currentUserId}
        />
      </div>
    </div>
  );
}
