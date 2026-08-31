"use client";

import { useMemo, useState } from "react";
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

import type { CompanyOption } from "@/lib/queries/companies";
import type { ContactRow } from "@/lib/queries/contacts";
import { deleteContactsAction, importContactsAction } from "@/lib/actions/contacts";
import { downloadCsv } from "@/lib/csv";
import { BulkActionsBar } from "@/components/bulk-actions-bar";
import { contactColumns } from "@/components/contacts/columns";
import { CONTACT_EXPORT_COLUMNS, toContactCsvRow } from "@/components/contacts/contact-csv";
import { ContactFormDialog } from "@/components/contacts/contact-form-dialog";
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

const ALL_COMPANIES = "all";

// Neither name field is marked required: a CSV with a single combined
// "Nom" column (mapped to either target) is split server-side, so
// hard-blocking the import button on both being mapped would defeat that.
// Company is optional too — unmatched rows just import unattached.
const CONTACT_IMPORT_FIELDS: ImportField[] = [
  { key: "firstName", label: "Prénom" },
  { key: "lastName", label: "Nom" },
  { key: "email", label: "Email" },
  { key: "phone", label: "Téléphone" },
  { key: "role", label: "Rôle" },
  { key: "companyName", label: "Entreprise" },
];

const COLUMN_LABELS: Record<string, string> = {
  fullName: "Nom complet",
  email: "Email",
  phone: "Téléphone",
  role: "Rôle",
  company: "Entreprise",
  createdAt: "Date d'ajout",
};

export function ContactsTable({
  data,
  companies,
}: {
  data: ContactRow[];
  companies: CompanyOption[];
}) {
  const [sorting, setSorting] = useState<SortingState>([
    { id: "createdAt", desc: true },
  ]);
  const [columnVisibility, setColumnVisibility] = useState<ColumnVisibilityState>(
    {}
  );
  const [globalFilter, setGlobalFilter] = useState("");
  const [companyFilter, setCompanyFilter] = useState(ALL_COMPANIES);
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [editingContact, setEditingContact] = useState<ContactRow | null>(null);
  const router = useRouter();

  const filteredData = useMemo(() => {
    if (companyFilter === ALL_COMPANIES) return data;
    return data.filter((contact) => contact.companyId === companyFilter);
  }, [data, companyFilter]);

  const table = useLegacyTable({
    data: filteredData,
    columns: contactColumns,
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
      const count = await deleteContactsAction(selectedIds);
      toast.success(`${count} contact${count > 1 ? "s" : ""} supprimé${count > 1 ? "s" : ""}.`);
      setRowSelection({});
      router.refresh();
    } catch (error) {
      toast.error("Impossible de supprimer ces contacts.", {
        description: error instanceof Error ? error.message : undefined,
      });
    }
  }

  function handleExport() {
    const rows = table.getRowModel().rows.map((r) => toContactCsvRow(r.original));
    downloadCsv(
      `contacts-${new Date().toISOString().slice(0, 10)}.csv`,
      CONTACT_EXPORT_COLUMNS,
      rows
    );
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex shrink-0 flex-wrap items-center gap-2 border-b p-3">
        <div className="relative w-full max-w-xs">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Rechercher par nom, email, entreprise..."
            value={globalFilter}
            onChange={(e) => setGlobalFilter(e.target.value)}
            className="h-8 pl-8"
          />
        </div>

        <Select value={companyFilter} onValueChange={(value) => setCompanyFilter(value ?? ALL_COMPANIES)}>
          <SelectTrigger className="h-8 w-48">
            <SelectValue placeholder="Toutes les entreprises" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_COMPANIES}>Toutes les entreprises</SelectItem>
            {companies.map((company) => (
              <SelectItem key={company.id} value={company.id}>
                {company.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <span className="text-sm text-muted-foreground">
          {table.getRowModel().rows.length} / {data.length}
        </span>

        <Button variant="outline" size="sm" onClick={handleExport}>
          <Download className="size-3.5" />
          Exporter (CSV)
        </Button>
        <ImportCsvDialog
          entityLabel="contacts"
          fields={CONTACT_IMPORT_FIELDS}
          onImport={importContactsAction}
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
                  colSpan={contactColumns.length}
                  className="h-32 text-center text-muted-foreground"
                >
                  Aucun contact ne correspond à ce filtre.
                </TableCell>
              </TableRow>
            ) : (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  className="cursor-pointer"
                  onClick={() => setEditingContact(row.original)}
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

      {editingContact && (
        <ContactFormDialog
          mode="edit"
          contact={editingContact}
          companies={companies}
          trigger={null}
          open={!!editingContact}
          onOpenChange={(open) => !open && setEditingContact(null)}
        />
      )}

      <BulkActionsBar
        selectedCount={selectedIds.length}
        itemLabel="contact"
        itemLabelPlural="contacts"
        onClear={() => setRowSelection({})}
        onConfirmDelete={handleBulkDelete}
      />
    </div>
  );
}
