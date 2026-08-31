import type { Row, RowData } from "@tanstack/react-table";
import type { LegacyFeatures } from "@tanstack/react-table/legacy";

export type SelectOption = { value: string; label: string };

export type DateRangeFilterValue = { from?: string; to?: string };

export type FilterFieldKind = "text" | "select" | "dateRange";

export type FilterFieldConfig = {
  id: string;
  label: string;
  kind: FilterFieldKind;
  options?: SelectOption[];
  placeholder?: string;
};

/** Case-insensitive substring match — for free-text column filters. Kept
 * generic over TData (rather than fixed to one table's row type) so it's
 * reusable as-is across every column helper in the app. */
export function textFilterFn<TData extends RowData>(
  row: Row<LegacyFeatures, TData>,
  columnId: string,
  filterValue: string
): boolean {
  const value = row.getValue(columnId);
  if (value === null || value === undefined || filterValue === "") return true;
  return String(value).toLowerCase().includes(String(filterValue).toLowerCase());
}

/** Row passes if its value is one of the selected options (or nothing is
 * selected, which is treated as "no restriction"). */
export function multiSelectFilterFn<TData extends RowData>(
  row: Row<LegacyFeatures, TData>,
  columnId: string,
  filterValue: string[]
): boolean {
  if (!filterValue || filterValue.length === 0) return true;
  return filterValue.includes(String(row.getValue(columnId)));
}

/** Inclusive [from, to] range over a Date/date-string column. */
export function dateRangeFilterFn<TData extends RowData>(
  row: Row<LegacyFeatures, TData>,
  columnId: string,
  filterValue: DateRangeFilterValue
): boolean {
  if (!filterValue || (!filterValue.from && !filterValue.to)) return true;
  const raw = row.getValue(columnId) as Date | string | null;
  if (!raw) return false;
  const date = new Date(raw);

  if (filterValue.from && date < new Date(filterValue.from)) return false;
  if (filterValue.to) {
    const end = new Date(filterValue.to);
    end.setHours(23, 59, 59, 999);
    if (date > end) return false;
  }
  return true;
}

/** Human-readable summary of a column filter's current value, for the
 * active-filters bar. Returns null when the filter is effectively empty. */
export function describeFilterValue(config: FilterFieldConfig, value: unknown): string | null {
  if (config.kind === "text") {
    const v = value as string | undefined;
    return v ? `« ${v} »` : null;
  }

  if (config.kind === "select") {
    const values = (value as string[] | undefined) ?? [];
    if (values.length === 0) return null;
    const labelFor = (v: string) => config.options?.find((o) => o.value === v)?.label ?? v;
    return values.map(labelFor).join(", ");
  }

  const range = value as DateRangeFilterValue | undefined;
  if (!range || (!range.from && !range.to)) return null;
  if (range.from && range.to) return `du ${range.from} au ${range.to}`;
  if (range.from) return `à partir du ${range.from}`;
  return `jusqu'au ${range.to}`;
}
