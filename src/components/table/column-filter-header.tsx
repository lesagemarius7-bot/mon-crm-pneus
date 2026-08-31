"use client";

import type { RowData } from "@tanstack/react-table";
import type { LegacyColumn } from "@tanstack/react-table/legacy";
import { ArrowUpDown, Filter } from "lucide-react";

import type { DateRangeFilterValue, FilterFieldKind, SelectOption } from "@/lib/table-filters";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

function isFilterActive(kind: FilterFieldKind, value: unknown): boolean {
  if (kind === "select") return Array.isArray(value) && value.length > 0;
  if (kind === "dateRange") {
    const range = value as DateRangeFilterValue | undefined;
    return !!range?.from || !!range?.to;
  }
  return !!value;
}

function TextFilterBody<TData extends RowData, TValue = unknown>({
  column,
  label,
  placeholder,
}: {
  column: LegacyColumn<TData, TValue>;
  label: string;
  placeholder?: string;
}) {
  const value = (column.getFilterValue() as string) ?? "";
  return (
    <div className="flex flex-col gap-2">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <Input
        autoFocus
        className="h-8"
        placeholder={placeholder ?? "Rechercher..."}
        defaultValue={value}
        onChange={(e) => column.setFilterValue(e.target.value || undefined)}
      />
    </div>
  );
}

function SelectFilterBody<TData extends RowData, TValue = unknown>({
  column,
  label,
  options,
}: {
  column: LegacyColumn<TData, TValue>;
  label: string;
  options: SelectOption[];
}) {
  const selected = (column.getFilterValue() as string[]) ?? [];
  return (
    <div className="flex flex-col gap-2">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <div className="flex max-h-48 flex-col gap-1.5 overflow-y-auto">
        {options.map((option) => (
          <label key={option.value} className="flex items-center gap-2 text-sm">
            <Checkbox
              checked={selected.includes(option.value)}
              onCheckedChange={(checked) => {
                const next = checked
                  ? [...selected, option.value]
                  : selected.filter((v) => v !== option.value);
                column.setFilterValue(next.length > 0 ? next : undefined);
              }}
            />
            {option.label}
          </label>
        ))}
      </div>
      {selected.length > 0 && (
        <Button
          type="button"
          variant="ghost"
          size="xs"
          className="self-start"
          onClick={() => column.setFilterValue(undefined)}
        >
          Effacer
        </Button>
      )}
    </div>
  );
}

function DateRangeFilterBody<TData extends RowData, TValue = unknown>({
  column,
  label,
}: {
  column: LegacyColumn<TData, TValue>;
  label: string;
}) {
  const value = (column.getFilterValue() as DateRangeFilterValue) ?? {};

  function update(patch: DateRangeFilterValue) {
    const next = { ...value, ...patch };
    column.setFilterValue(next.from || next.to ? next : undefined);
  }

  return (
    <div className="flex flex-col gap-2">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <div className="flex flex-col gap-1.5">
        <Input
          type="date"
          className="h-8"
          value={value.from ?? ""}
          onChange={(e) => update({ from: e.target.value || undefined })}
        />
        <Input
          type="date"
          className="h-8"
          value={value.to ?? ""}
          onChange={(e) => update({ to: e.target.value || undefined })}
        />
      </div>
      {(value.from || value.to) && (
        <Button
          type="button"
          variant="ghost"
          size="xs"
          className="self-start"
          onClick={() => column.setFilterValue(undefined)}
        >
          Effacer
        </Button>
      )}
    </div>
  );
}

/**
 * Column header used across the Companies/Contacts tables: label (+
 * optional sort toggle) plus a funnel icon opening a popover with the
 * appropriate filter input for `kind`. The funnel highlights in the brand
 * primary color whenever this column has an active filter.
 */
export function ColumnFilterHeader<TData extends RowData, TValue = unknown>({
  label,
  column,
  kind,
  options,
  placeholder,
  sortable = false,
}: {
  label: string;
  column: LegacyColumn<TData, TValue>;
  kind: FilterFieldKind;
  options?: SelectOption[];
  placeholder?: string;
  sortable?: boolean;
}) {
  const active = isFilterActive(kind, column.getFilterValue());

  return (
    <div className="flex items-center gap-0.5">
      {sortable ? (
        <Button
          variant="ghost"
          size="sm"
          className="-ml-3 h-7 px-2 font-medium text-muted-foreground hover:text-foreground"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          {label}
          <ArrowUpDown className="size-3.5" />
        </Button>
      ) : (
        <span className="px-1 text-sm font-medium text-muted-foreground">{label}</span>
      )}

      <Popover>
        <PopoverTrigger
          render={
            <Button
              variant="ghost"
              size="icon-xs"
              aria-label={`Filtrer par ${label}`}
              className={cn(active && "text-primary")}
            />
          }
        >
          <Filter className={cn("size-3", active && "fill-primary/30")} />
        </PopoverTrigger>
        <PopoverContent align="start" className="w-56 p-3">
          {kind === "text" && (
            <TextFilterBody column={column} label={label} placeholder={placeholder} />
          )}
          {kind === "select" && (
            <SelectFilterBody column={column} label={label} options={options ?? []} />
          )}
          {kind === "dateRange" && <DateRangeFilterBody column={column} label={label} />}
        </PopoverContent>
      </Popover>
    </div>
  );
}
