"use client";

import type { ColumnFiltersState } from "@tanstack/react-table";
import { X } from "lucide-react";

import type { FilterFieldConfig } from "@/lib/table-filters";
import { describeFilterValue } from "@/lib/table-filters";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

/**
 * Summary bar shown under the search input whenever at least one column
 * filter is active — one removable chip per filter, plus a reset-all.
 */
export function ActiveFiltersBar({
  columnFilters,
  fields,
  onRemove,
  onReset,
}: {
  columnFilters: ColumnFiltersState;
  fields: FilterFieldConfig[];
  onRemove: (columnId: string) => void;
  onReset: () => void;
}) {
  const active = columnFilters
    .map((filter) => {
      const config = fields.find((f) => f.id === filter.id);
      if (!config) return null;
      const text = describeFilterValue(config, filter.value);
      return text ? { id: filter.id, label: config.label, text } : null;
    })
    .filter((f): f is { id: string; label: string; text: string } => !!f);

  if (active.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-1.5 border-b bg-primary/5 px-3 py-2">
      <span className="text-xs text-muted-foreground">Filtres actifs :</span>
      {active.map((filter) => (
        <Badge key={filter.id} variant="outline" className="gap-1 border-primary/40 bg-background">
          {filter.label} : {filter.text}
          <button
            type="button"
            onClick={() => onRemove(filter.id)}
            aria-label={`Retirer le filtre ${filter.label}`}
            className="ml-0.5 rounded-full hover:text-destructive"
          >
            <X className="size-3" />
          </button>
        </Badge>
      ))}
      <Button
        type="button"
        variant="ghost"
        size="xs"
        className="ml-auto text-muted-foreground"
        onClick={onReset}
      >
        Réinitialiser tous les filtres
      </Button>
    </div>
  );
}
