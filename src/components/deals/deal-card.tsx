"use client";

import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { Building2, CalendarDays, GripVertical, Tag } from "lucide-react";

import type { BoardDeal } from "@/lib/queries/deals";
import { formatCurrency, formatDate } from "@/lib/labels";
import { AssigneeBadge } from "@/components/assignee/assignee-badge";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export function DealCard({
  deal,
  onOpen,
}: {
  deal: BoardDeal;
  onOpen: (id: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({ id: deal.id, data: { stageId: deal.stageId } });

  const style = transform
    ? { transform: CSS.Translate.toString(transform) }
    : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      onClick={() => !isDragging && onOpen(deal.id)}
      className={cn(
        "group cursor-pointer rounded-lg border bg-card p-3 text-sm shadow-sm transition-shadow hover:shadow-md",
        isDragging && "opacity-40"
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="font-medium leading-tight">{deal.name}</p>
        <button
          type="button"
          {...attributes}
          {...listeners}
          onClick={(e) => e.stopPropagation()}
          className="-mt-1 -mr-1 shrink-0 cursor-grab touch-none rounded p-1 text-muted-foreground opacity-0 hover:bg-muted group-hover:opacity-100 active:cursor-grabbing"
          aria-label="Déplacer"
        >
          <GripVertical className="size-3.5" />
        </button>
      </div>

      <div className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
        <Building2 className="size-3.5 shrink-0" />
        <span className="truncate">{deal.company.name}</span>
      </div>

      {deal.proposedBrand && (
        <div className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
          <Tag className="size-3.5 shrink-0" />
          <span className="truncate">{deal.proposedBrand}</span>
        </div>
      )}

      {deal.expectedCloseDate && (
        <div className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
          <CalendarDays className="size-3.5 shrink-0" />
          {formatDate(deal.expectedCloseDate)}
        </div>
      )}

      <div className="mt-2 flex items-center justify-between">
        <Badge variant="outline" className="font-mono">
          {formatCurrency(deal.value)}
        </Badge>
        <AssigneeBadge assignee={deal.owner} showLabel={false} />
      </div>
    </div>
  );
}
