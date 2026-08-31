"use client";

import Link from "next/link";
import { User } from "lucide-react";

import type { ContactRow } from "@/lib/queries/contacts";
import { CONTACT_ROLE_LABELS, formatDate } from "@/lib/labels";
import { dateRangeFilterFn, multiSelectFilterFn, textFilterFn } from "@/lib/table-filters";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { ColumnFilterHeader } from "@/components/table/column-filter-header";
import { legacyCreateColumnHelper } from "@tanstack/react-table/legacy";

const columnHelper = legacyCreateColumnHelper<ContactRow>();

const CONTACT_ROLE_OPTIONS = Object.entries(CONTACT_ROLE_LABELS).map(([value, label]) => ({
  value,
  label,
}));

export const contactColumns = columnHelper.columns([
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
  columnHelper.accessor((row) => `${row.firstName} ${row.lastName}`, {
    id: "fullName",
    header: ({ column }) => (
      <ColumnFilterHeader label="Nom complet" column={column} kind="text" sortable />
    ),
    filterFn: textFilterFn,
    cell: ({ row }) => (
      <div className="flex items-center gap-2 font-medium">
        <div className="flex size-6 shrink-0 items-center justify-center rounded-md bg-muted">
          <User className="size-3.5 text-muted-foreground" />
        </div>
        <span className="truncate">
          {row.original.firstName} {row.original.lastName}
        </span>
      </div>
    ),
    minSize: 200,
  }),
  columnHelper.accessor("email", {
    header: ({ column }) => <ColumnFilterHeader label="Email" column={column} kind="text" />,
    filterFn: textFilterFn,
    cell: ({ getValue }) => getValue() ?? "—",
  }),
  columnHelper.accessor("phone", {
    header: ({ column }) => <ColumnFilterHeader label="Téléphone" column={column} kind="text" />,
    filterFn: textFilterFn,
    cell: ({ getValue }) => getValue() ?? "—",
  }),
  columnHelper.accessor("role", {
    header: ({ column }) => (
      <ColumnFilterHeader label="Rôle" column={column} kind="select" options={CONTACT_ROLE_OPTIONS} />
    ),
    filterFn: multiSelectFilterFn,
    cell: ({ getValue }) => (
      <Badge variant="outline">{CONTACT_ROLE_LABELS[getValue()]}</Badge>
    ),
  }),
  columnHelper.accessor((row) => row.company?.name ?? "", {
    id: "company",
    header: ({ column }) => <ColumnFilterHeader label="Entreprise" column={column} kind="text" />,
    filterFn: textFilterFn,
    cell: ({ row }) =>
      row.original.company ? (
        <Link
          href={`/companies?id=${row.original.company.id}`}
          className="text-primary hover:underline"
          onClick={(e) => e.stopPropagation()}
        >
          {row.original.company.name}
        </Link>
      ) : (
        <span className="text-muted-foreground">—</span>
      ),
  }),
  columnHelper.accessor("createdAt", {
    header: ({ column }) => (
      <ColumnFilterHeader label="Date d'ajout" column={column} kind="dateRange" sortable />
    ),
    filterFn: dateRangeFilterFn,
    cell: ({ getValue }) => (
      <span className="text-muted-foreground">{formatDate(getValue())}</span>
    ),
  }),
]);
