"use client";

import Link from "next/link";
import { ArrowUpDown, User } from "lucide-react";

import type { ContactRow } from "@/lib/queries/contacts";
import { CONTACT_ROLE_LABELS, formatDate } from "@/lib/labels";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { legacyCreateColumnHelper } from "@tanstack/react-table/legacy";

const columnHelper = legacyCreateColumnHelper<ContactRow>();

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
      <SortableHeader
        label="Nom complet"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      />
    ),
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
    header: "Email",
    cell: ({ getValue }) => getValue() ?? "—",
  }),
  columnHelper.accessor("phone", {
    header: "Téléphone",
    cell: ({ getValue }) => getValue() ?? "—",
  }),
  columnHelper.accessor("role", {
    header: "Rôle",
    cell: ({ getValue }) => (
      <Badge variant="outline">{CONTACT_ROLE_LABELS[getValue()]}</Badge>
    ),
  }),
  columnHelper.accessor((row) => row.company?.name ?? "", {
    id: "company",
    header: "Entreprise",
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
      <SortableHeader
        label="Date d'ajout"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      />
    ),
    cell: ({ getValue }) => (
      <span className="text-muted-foreground">{formatDate(getValue())}</span>
    ),
  }),
]);
