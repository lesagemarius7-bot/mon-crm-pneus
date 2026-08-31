"use client";

import Link from "next/link";
import { ArrowUpDown } from "lucide-react";

import type { CompanyRow } from "@/lib/queries/companies";
import type { SelectOption } from "@/lib/table-filters";
import { dateRangeFilterFn, multiSelectFilterFn, textFilterFn } from "@/lib/table-filters";
import {
  COMPANY_STATUS_BADGE,
  COMPANY_STATUS_LABELS,
  COMPANY_TYPE_LABELS,
  formatCurrency,
  formatDate,
} from "@/lib/labels";
import { AssigneeBadge } from "@/components/assignee/assignee-badge";
import { CompanyLogo } from "@/components/companies/company-logo";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ColumnFilterHeader } from "@/components/table/column-filter-header";
import { legacyCreateColumnHelper } from "@tanstack/react-table/legacy";

const COMPANY_TYPE_OPTIONS = Object.entries(COMPANY_TYPE_LABELS).map(([value, label]) => ({
  value,
  label,
}));
const COMPANY_STATUS_OPTIONS = Object.entries(COMPANY_STATUS_LABELS).map(([value, label]) => ({
  value,
  label,
}));

const columnHelper = legacyCreateColumnHelper<CompanyRow>();

function SortableHeader({
  label,
  onClick,
}: {
  label: string;
  onClick: () => void;
}) {
  return (
    <Button
      variant="ghost"
      size="sm"
      className="-ml-3 h-7 px-2 font-medium text-muted-foreground hover:text-foreground"
      onClick={onClick}
    >
      {label}
      <ArrowUpDown className="size-3.5" />
    </Button>
  );
}

export function getCompanyColumns(assigneeOptions: SelectOption[]) {
  return columnHelper.columns([
  columnHelper.display({
    id: "select",
    header: ({ table }) => (
      <div onClick={(e) => e.stopPropagation()}>
        <Checkbox
          checked={table.getIsAllRowsSelected()}
          indeterminate={table.getIsSomeRowsSelected() && !table.getIsAllRowsSelected()}
          onCheckedChange={(checked) => table.toggleAllRowsSelected(!!checked)}
          aria-label="Tout sélectionner"
        />
      </div>
    ),
    cell: ({ row }) => (
      <div onClick={(e) => e.stopPropagation()}>
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(checked) => row.toggleSelected(!!checked)}
          aria-label="Sélectionner la ligne"
        />
      </div>
    ),
    enableHiding: false,
    size: 36,
  }),
  columnHelper.accessor("name", {
    header: ({ column }) => (
      <ColumnFilterHeader
        label="Entreprise"
        column={column}
        kind="text"
        sortable
        placeholder="Rechercher un nom..."
      />
    ),
    filterFn: textFilterFn,
    cell: ({ row }) => (
      <div className="flex items-center gap-2 font-medium">
        <CompanyLogo website={row.original.website} className="size-6" iconClassName="size-3.5" />
        <span className="truncate">{row.original.name}</span>
      </div>
    ),
    minSize: 220,
  }),
  columnHelper.accessor("type", {
    header: ({ column }) => (
      <ColumnFilterHeader
        label="Type"
        column={column}
        kind="select"
        options={COMPANY_TYPE_OPTIONS}
      />
    ),
    filterFn: multiSelectFilterFn,
    cell: ({ getValue }) => (
      <span className="text-muted-foreground">
        {COMPANY_TYPE_LABELS[getValue()]}
      </span>
    ),
  }),
  columnHelper.accessor("status", {
    header: ({ column }) => (
      <ColumnFilterHeader
        label="Statut"
        column={column}
        kind="select"
        options={COMPANY_STATUS_OPTIONS}
      />
    ),
    filterFn: multiSelectFilterFn,
    cell: ({ getValue }) => {
      const status = getValue();
      return (
        <Badge variant={COMPANY_STATUS_BADGE[status]}>
          {COMPANY_STATUS_LABELS[status]}
        </Badge>
      );
    },
  }),
  columnHelper.accessor("fleetSize", {
    header: ({ column }) => (
      <SortableHeader
        label="Taille flotte"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      />
    ),
    cell: ({ getValue }) => getValue() ?? "—",
  }),
  columnHelper.accessor("estimatedRevenue", {
    header: ({ column }) => (
      <SortableHeader
        label="CA estimé"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      />
    ),
    cell: ({ getValue }) => formatCurrency(getValue()),
  }),
  columnHelper.accessor("city", {
    header: ({ column }) => <ColumnFilterHeader label="Ville" column={column} kind="text" />,
    filterFn: textFilterFn,
    cell: ({ getValue }) => getValue() ?? "—",
  }),
  columnHelper.accessor("siret", {
    header: "SIRET",
    cell: ({ getValue }) => (
      <span className="font-mono text-xs text-muted-foreground">
        {getValue() ?? "—"}
      </span>
    ),
  }),
  columnHelper.accessor("phone", {
    header: "Téléphone",
    cell: ({ getValue }) => getValue() ?? "—",
  }),
  columnHelper.accessor((row) => row._count.deals, {
    id: "dealsCount",
    header: "Deals",
    cell: ({ getValue, row }) => {
      const count = getValue();
      if (!count) return <span className="text-muted-foreground">—</span>;
      return (
        <Link
          href={`/deals?company=${row.original.id}`}
          className="text-primary hover:underline"
          onClick={(e) => e.stopPropagation()}
        >
          {count}
        </Link>
      );
    },
  }),
  columnHelper.accessor((row) => row._count.vehicles, {
    id: "vehiclesCount",
    header: "Véhicules",
    cell: ({ getValue }) => getValue() || "—",
  }),
  columnHelper.accessor((row) => row.assignedTo?.id ?? "", {
    id: "assignedTo",
    header: ({ column }) => (
      <ColumnFilterHeader
        label="Assigné à"
        column={column}
        kind="select"
        options={assigneeOptions}
      />
    ),
    filterFn: multiSelectFilterFn,
    cell: ({ row }) => <AssigneeBadge assignee={row.original.assignedTo} />,
  }),
  columnHelper.accessor("updatedAt", {
    header: ({ column }) => (
      <ColumnFilterHeader label="Mis à jour" column={column} kind="dateRange" sortable />
    ),
    filterFn: dateRangeFilterFn,
    cell: ({ getValue }) => (
      <span className="text-muted-foreground">{formatDate(getValue())}</span>
    ),
  }),
  ]);
}
