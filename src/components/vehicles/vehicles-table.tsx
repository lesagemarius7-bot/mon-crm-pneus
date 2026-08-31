"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Columns3, Search } from "lucide-react";
import {
  flexRender,
  type ColumnVisibilityState,
  type RowSelectionState,
  type SortingState,
} from "@tanstack/react-table";
import {
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  useLegacyTable,
} from "@tanstack/react-table/legacy";
import { toast } from "sonner";

import type { CompanyOption } from "@/lib/queries/companies";
import type { VehicleRow } from "@/lib/queries/vehicles";
import { deleteVehiclesAction } from "@/lib/actions/vehicles";
import { TIRE_TYPE_LABELS } from "@/lib/labels";
import { BulkActionsBar } from "@/components/bulk-actions-bar";
import { vehicleColumns } from "@/components/vehicles/columns";
import { VehicleFormDialog } from "@/components/vehicles/vehicle-form-dialog";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const ALL_TIRE_TYPES = "all";

const COLUMN_LABELS: Record<string, string> = {
  label: "Nom / Immatriculation",
  tireType: "Type",
  tireDimension: "Dimensions pneus",
  currentBrand: "Marque actuelle",
  renewalFrequencyMonths: "Fréquence renouvellement",
  company: "Entreprise",
};

export function VehiclesTable({
  data,
  companies,
}: {
  data: VehicleRow[];
  companies: CompanyOption[];
}) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnVisibility, setColumnVisibility] = useState<ColumnVisibilityState>(
    {}
  );
  const [globalFilter, setGlobalFilter] = useState("");
  const [tireTypeFilter, setTireTypeFilter] = useState(ALL_TIRE_TYPES);
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [editingVehicle, setEditingVehicle] = useState<VehicleRow | null>(null);
  const router = useRouter();

  const filteredData = useMemo(() => {
    if (tireTypeFilter === ALL_TIRE_TYPES) return data;
    return data.filter((vehicle) => vehicle.tireType === tireTypeFilter);
  }, [data, tireTypeFilter]);

  const table = useLegacyTable({
    data: filteredData,
    columns: vehicleColumns,
    getRowId: (row) => row.id,
    state: { sorting, columnVisibility, globalFilter, rowSelection },
    onSortingChange: setSorting,
    onColumnVisibilityChange: setColumnVisibility,
    onGlobalFilterChange: setGlobalFilter,
    onRowSelectionChange: setRowSelection,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  });

  const selectedIds = Object.keys(rowSelection).filter((id) => rowSelection[id]);

  async function handleBulkDelete() {
    try {
      const count = await deleteVehiclesAction(selectedIds);
      toast.success(`${count} véhicule${count > 1 ? "s" : ""} supprimé${count > 1 ? "s" : ""}.`);
      setRowSelection({});
      router.refresh();
    } catch (error) {
      toast.error("Impossible de supprimer ces véhicules.", {
        description: error instanceof Error ? error.message : undefined,
      });
    }
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex shrink-0 flex-wrap items-center gap-2 border-b p-3">
        <div className="relative w-full max-w-xs">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Rechercher un véhicule, une entreprise..."
            value={globalFilter}
            onChange={(e) => setGlobalFilter(e.target.value)}
            className="h-8 pl-8"
          />
        </div>

        <Select value={tireTypeFilter} onValueChange={(value) => setTireTypeFilter(value ?? ALL_TIRE_TYPES)}>
          <SelectTrigger className="h-8 w-48">
            <SelectValue placeholder="Tous les types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_TIRE_TYPES}>Tous les types</SelectItem>
            {Object.entries(TIRE_TYPE_LABELS).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <span className="text-sm text-muted-foreground">
          {table.getRowModel().rows.length} / {data.length}
        </span>

        <div className="ml-auto">
          <DropdownMenu>
            <DropdownMenuTrigger render={<Button variant="outline" size="sm" />}>
              <Columns3 className="size-3.5" />
              Colonnes
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              {table
                .getAllColumns()
                .filter((column) => column.getCanHide())
                .map((column) => (
                  <DropdownMenuCheckboxItem
                    key={column.id}
                    checked={column.getIsVisible()}
                    onCheckedChange={(value) => column.toggleVisibility(!!value)}
                    onSelect={(e) => e.preventDefault()}
                  >
                    {COLUMN_LABELS[column.id] ?? column.id}
                  </DropdownMenuCheckboxItem>
                ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        <Table>
          <TableHeader className="sticky top-0 z-10 bg-background">
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id} className="hover:bg-transparent">
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id} style={{ minWidth: header.column.columnDef.minSize }}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={vehicleColumns.length}
                  className="h-32 text-center text-muted-foreground"
                >
                  Aucun véhicule ne correspond à ce filtre.
                </TableCell>
              </TableRow>
            ) : (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  className="cursor-pointer"
                  onClick={() => setEditingVehicle(row.original)}
                >
                  {row.getAllCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {editingVehicle && (
        <VehicleFormDialog
          mode="edit"
          vehicle={editingVehicle}
          companies={companies}
          trigger={null}
          open={!!editingVehicle}
          onOpenChange={(open) => !open && setEditingVehicle(null)}
        />
      )}

      <BulkActionsBar
        selectedCount={selectedIds.length}
        itemLabel="véhicule"
        itemLabelPlural="véhicules"
        onClear={() => setRowSelection({})}
        onConfirmDelete={handleBulkDelete}
      />
    </div>
  );
}
