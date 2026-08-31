"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Columns3, Download, Search } from "lucide-react";
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

import type { CompanyRow } from "@/lib/queries/companies";
import { deleteCompaniesAction, importCompaniesAction } from "@/lib/actions/companies";
import { downloadCsv } from "@/lib/csv";
import { useRealtimeSync, type RealtimeTable } from "@/hooks/use-realtime-sync";
import { BulkActionsBar } from "@/components/bulk-actions-bar";
import { companyColumns } from "@/components/companies/columns";
import { COMPANY_EXPORT_COLUMNS, toCompanyCsvRow } from "@/components/companies/company-csv";
import { CompanyDetailSheet } from "@/components/companies/company-detail-sheet";
import { Button } from "@/components/ui/button";
import { ImportCsvDialog, type ImportField } from "@/components/import/import-csv-dialog";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

// Columns hideable-by-default to keep the table dense on first load —
// still one click away via the column-visibility menu.
const DEFAULT_HIDDEN_COLUMNS: ColumnVisibilityState = {
  siret: false,
  phone: false,
};

// Module-level so useRealtimeSync always receives a stable array reference.
const REALTIME_TABLES: RealtimeTable[] = ["companies"];

const COMPANY_IMPORT_FIELDS: ImportField[] = [
  { key: "name", label: "Nom", required: true },
  { key: "siret", label: "SIRET" },
  { key: "type", label: "Type" },
  { key: "status", label: "Statut" },
  { key: "fleetSize", label: "Taille de flotte" },
  { key: "estimatedRevenue", label: "CA estimé" },
];

const COLUMN_LABELS: Record<string, string> = {
  name: "Entreprise",
  type: "Type",
  status: "Statut",
  fleetSize: "Taille flotte",
  estimatedRevenue: "CA estimé",
  city: "Ville",
  siret: "SIRET",
  phone: "Téléphone",
  dealsCount: "Deals",
  vehiclesCount: "Véhicules",
  updatedAt: "Mis à jour",
};

export function CompaniesTable({
  data,
  initialSelectedId,
}: {
  data: CompanyRow[];
  /** Opens that company's drawer on mount — e.g. a "?id=..." link from the
   * Contacts/Vehicles/Deals views pointing at their linked company. */
  initialSelectedId?: string | null;
}) {
  const [sorting, setSorting] = useState<SortingState>([
    { id: "updatedAt", desc: true },
  ]);
  const [columnVisibility, setColumnVisibility] = useState<ColumnVisibilityState>(
    DEFAULT_HIDDEN_COLUMNS
  );
  const [globalFilter, setGlobalFilter] = useState("");
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(
    () => initialSelectedId ?? null
  );
  const router = useRouter();

  useRealtimeSync(REALTIME_TABLES);

  const table = useLegacyTable({
    data,
    columns: companyColumns,
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
      const count = await deleteCompaniesAction(selectedIds);
      toast.success(`${count} entreprise${count > 1 ? "s" : ""} supprimée${count > 1 ? "s" : ""}.`);
      setRowSelection({});
      router.refresh();
    } catch (error) {
      toast.error("Impossible de supprimer ces entreprises.", {
        description: error instanceof Error ? error.message : undefined,
      });
    }
  }

  function handleExport() {
    const rows = table.getRowModel().rows.map((r) => toCompanyCsvRow(r.original));
    downloadCsv(
      `entreprises-${new Date().toISOString().slice(0, 10)}.csv`,
      COMPANY_EXPORT_COLUMNS,
      rows
    );
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex shrink-0 items-center gap-2 border-b p-3">
        <div className="relative w-full max-w-xs">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Filtrer les entreprises..."
            value={globalFilter}
            onChange={(e) => setGlobalFilter(e.target.value)}
            className="h-8 pl-8"
          />
        </div>
        <span className="text-sm text-muted-foreground">
          {table.getRowModel().rows.length} / {data.length}
        </span>
        <Button variant="outline" size="sm" onClick={handleExport}>
          <Download className="size-3.5" />
          Exporter (CSV)
        </Button>
        <ImportCsvDialog
          entityLabel="entreprises"
          fields={COMPANY_IMPORT_FIELDS}
          onImport={importCompaniesAction}
        />

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
                  colSpan={companyColumns.length}
                  className="h-32 text-center text-muted-foreground"
                >
                  Aucune entreprise ne correspond à ce filtre.
                </TableCell>
              </TableRow>
            ) : (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  className="cursor-pointer"
                  onClick={() => setSelectedCompanyId(row.original.id)}
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

      <CompanyDetailSheet
        companyId={selectedCompanyId}
        onOpenChange={(open) => !open && setSelectedCompanyId(null)}
      />

      <BulkActionsBar
        selectedCount={selectedIds.length}
        itemLabel="entreprise"
        itemLabelPlural="entreprises"
        warningText="Les véhicules, deals, notes et activités associés seront aussi supprimés ; les contacts liés seront conservés mais détachés."
        onClear={() => setRowSelection({})}
        onConfirmDelete={handleBulkDelete}
      />
    </div>
  );
}
