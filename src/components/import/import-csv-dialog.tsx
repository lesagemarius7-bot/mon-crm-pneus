"use client";

import { useState, type ReactElement } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, CheckCircle2, Loader2, Upload } from "lucide-react";
import { toast } from "sonner";

import { parseCsvFile, type ParsedCsv } from "@/lib/csv";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
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

const NO_MAPPING = "__none__";
const PREVIEW_ROW_COUNT = 5;

export type ImportField = {
  key: string;
  label: string;
  required?: boolean;
};

export type ImportRowError = { row: number; message: string };
export type ImportResult = { successCount: number; errors: ImportRowError[] };

function normalize(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

function guessMapping(headers: string[], fields: ImportField[]) {
  const mapping: Record<string, string> = {};
  for (const field of fields) {
    const match = headers.find(
      (h) => normalize(h) === normalize(field.label) || normalize(h) === normalize(field.key)
    );
    if (match) mapping[field.key] = match;
  }
  return mapping;
}

type Step = "upload" | "mapping" | "done";

export function ImportCsvDialog({
  entityLabel,
  fields,
  onImport,
  trigger,
}: {
  /** Used in messages, e.g. "entreprises" or "contacts". */
  entityLabel: string;
  fields: ImportField[];
  onImport: (rows: Record<string, string>[]) => Promise<ImportResult>;
  trigger?: ReactElement;
}) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<Step>("upload");
  const [parsed, setParsed] = useState<ParsedCsv | null>(null);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const router = useRouter();

  function reset() {
    setStep("upload");
    setParsed(null);
    setMapping({});
    setResult(null);
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const csv = await parseCsvFile(file);
      if (csv.rows.length === 0) {
        toast.error("Le fichier CSV est vide ou illisible.");
        return;
      }
      setParsed(csv);
      setMapping(guessMapping(csv.headers, fields));
      setStep("mapping");
    } catch (error) {
      toast.error("Impossible de lire ce fichier CSV.", {
        description: error instanceof Error ? error.message : undefined,
      });
    } finally {
      e.target.value = "";
    }
  }

  const missingRequired = fields.filter((f) => f.required && !mapping[f.key]);

  async function handleImport() {
    if (!parsed) return;
    setSubmitting(true);
    try {
      const mappedRows = parsed.rows.map((row) => {
        const mapped: Record<string, string> = {};
        for (const field of fields) {
          const header = mapping[field.key];
          mapped[field.key] = header ? (row[header] ?? "").trim() : "";
        }
        return mapped;
      });

      const importResult = await onImport(mappedRows);
      setResult(importResult);
      setStep("done");

      if (importResult.successCount > 0) {
        router.refresh();
      }
      if (importResult.errors.length === 0) {
        toast.success(
          `${importResult.successCount} ${entityLabel} importé(e)s avec succès.`
        );
      } else {
        toast.warning(
          `${importResult.successCount} ${entityLabel} importé(e)s, ${importResult.errors.length} erreur(s).`
        );
      }
    } catch (error) {
      toast.error("Échec de l'import.", {
        description: error instanceof Error ? error.message : undefined,
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) reset();
      }}
    >
      <DialogTrigger
        render={
          trigger ?? (
            <Button variant="outline" size="sm">
              <Upload className="size-3.5" />
              Importer (CSV)
            </Button>
          )
        }
      />
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Importer des {entityLabel} (CSV)</DialogTitle>
          <DialogDescription>
            {step === "upload" &&
              "Sélectionne un fichier .csv, puis fais correspondre ses colonnes aux champs du CRM."}
            {step === "mapping" &&
              `${parsed?.rows.length ?? 0} ligne(s) détectée(s). Vérifie la correspondance des colonnes avant d'importer.`}
            {step === "done" && "Résultat de l'import."}
          </DialogDescription>
        </DialogHeader>

        {step === "upload" && (
          <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed p-10 text-center">
            <Upload className="size-6 text-muted-foreground" />
            <div>
              <Label htmlFor="csv-file" className="cursor-pointer text-sm font-medium">
                Choisir un fichier .csv
              </Label>
              <p className="mt-1 text-xs text-muted-foreground">
                Première ligne = en-têtes de colonnes.
              </p>
            </div>
            <input
              id="csv-file"
              type="file"
              accept=".csv,text/csv"
              onChange={handleFileChange}
              className="cursor-pointer text-sm file:mr-3 file:cursor-pointer file:rounded-md file:border-0 file:bg-secondary file:px-3 file:py-1.5 file:text-sm"
            />
          </div>
        )}

        {step === "mapping" && parsed && (
          <div className="flex max-h-[60vh] flex-col gap-4 overflow-y-auto">
            <div className="grid grid-cols-2 gap-3">
              {fields.map((field) => (
                <div key={field.key} className="flex flex-col gap-1.5">
                  <Label>
                    {field.label}
                    {field.required && <span className="text-destructive"> *</span>}
                  </Label>
                  <Select
                    value={mapping[field.key] || NO_MAPPING}
                    onValueChange={(value) =>
                      setMapping((prev) => ({
                        ...prev,
                        [field.key]: value === NO_MAPPING ? "" : (value ?? ""),
                      }))
                    }
                  >
                    <SelectTrigger className="h-8">
                      <SelectValue placeholder="Ignorer" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NO_MAPPING}>Ignorer</SelectItem>
                      {parsed.headers.map((header) => (
                        <SelectItem key={header} value={header}>
                          {header}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>

            <div>
              <p className="mb-1.5 text-xs font-medium text-muted-foreground">
                Aperçu (premières lignes du fichier)
              </p>
              <div className="overflow-x-auto rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      {parsed.headers.map((header) => (
                        <TableHead key={header} className="whitespace-nowrap">
                          {header}
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {parsed.rows.slice(0, PREVIEW_ROW_COUNT).map((row, i) => (
                      <TableRow key={i}>
                        {parsed.headers.map((header) => (
                          <TableCell key={header} className="whitespace-nowrap text-xs">
                            {row[header]}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>

            {missingRequired.length > 0 && (
              <p className="flex items-center gap-1.5 text-xs text-destructive">
                <AlertCircle className="size-3.5" />
                Champ(s) requis non mappé(s) :{" "}
                {missingRequired.map((f) => f.label).join(", ")}
              </p>
            )}
          </div>
        )}

        {step === "done" && result && (
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2 text-sm">
              <CheckCircle2 className="size-4 text-emerald-600" />
              {result.successCount} {entityLabel} importé(e)s avec succès.
            </div>
            {result.errors.length > 0 && (
              <div className="flex flex-col gap-1.5">
                <p className="flex items-center gap-1.5 text-sm text-destructive">
                  <AlertCircle className="size-4" />
                  {result.errors.length} ligne(s) en erreur
                </p>
                <ul className="max-h-48 overflow-y-auto rounded-md border p-2 text-xs text-muted-foreground">
                  {result.errors.map((err, i) => (
                    <li key={i}>
                      Ligne {err.row} : {err.message}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        <DialogFooter>
          {step === "mapping" && (
            <>
              <Button type="button" variant="outline" onClick={reset}>
                Retour
              </Button>
              <Button
                type="button"
                onClick={handleImport}
                disabled={submitting || missingRequired.length > 0}
              >
                {submitting && <Loader2 className="animate-spin" />}
                Importer {parsed?.rows.length ?? 0} ligne(s)
              </Button>
            </>
          )}
          {step === "done" && (
            <Button type="button" onClick={() => setOpen(false)}>
              Fermer
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
