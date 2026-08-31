"use client";

import Link from "next/link";
import { ArrowUpDown, Truck } from "lucide-react";

import type { VehicleRow } from "@/lib/queries/vehicles";
import { TIRE_TYPE_LABELS } from "@/lib/labels";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { legacyCreateColumnHelper } from "@tanstack/react-table/legacy";

const columnHelper = legacyCreateColumnHelper<VehicleRow>();

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

export const vehicleColumns = columnHelper.columns([
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
  columnHelper.accessor("label", {
    header: ({ column }) => (
      <SortableHeader
        label="Nom / Immatriculation"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      />
    ),
    cell: ({ row }) => (
      <div className="flex items-center gap-2">
        <div className="flex size-6 shrink-0 items-center justify-center rounded-md bg-muted">
          <Truck className="size-3.5 text-muted-foreground" />
        </div>
        <div className="min-w-0">
          <p className="truncate font-medium">{row.original.label}</p>
          {row.original.registrationPlate && (
            <p className="truncate font-mono text-xs text-muted-foreground">
              {row.original.registrationPlate}
            </p>
          )}
        </div>
      </div>
    ),
    minSize: 220,
  }),
  columnHelper.accessor("tireType", {
    header: "Type",
    cell: ({ getValue }) => (
      <Badge variant="outline">{TIRE_TYPE_LABELS[getValue()]}</Badge>
    ),
  }),
  columnHelper.accessor("tireDimension", {
    header: "Dimensions pneus",
  }),
  columnHelper.accessor("currentBrand", {
    header: "Marque actuelle",
    cell: ({ getValue }) => getValue() ?? "—",
  }),
  columnHelper.accessor("renewalFrequencyMonths", {
    header: ({ column }) => (
      <SortableHeader
        label="Fréquence renouvellement"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      />
    ),
    cell: ({ getValue }) => {
      const months = getValue();
      return months ? `${months} mois` : "—";
    },
  }),
  columnHelper.accessor((row) => row.company?.name ?? "", {
    id: "company",
    header: "Entreprise",
    cell: ({ row }) => (
      <Link
        href={`/companies?id=${row.original.company.id}`}
        className="text-primary hover:underline"
        onClick={(e) => e.stopPropagation()}
      >
        {row.original.company.name}
      </Link>
    ),
  }),
]);
