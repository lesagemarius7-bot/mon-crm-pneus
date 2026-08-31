"use client";

import { useEffect, useState, type ReactElement, type ReactNode } from "react";
import { GitMerge, Loader2 } from "lucide-react";
import { toast } from "sonner";

import type { CompanyMergeCandidate } from "@/lib/queries/companies";
import { getCompanyMergeCandidateAction, mergeCompaniesAction } from "@/lib/actions/companies";
import { COMPANY_STATUS_LABELS, COMPANY_TYPE_LABELS, formatCurrency } from "@/lib/labels";
import { cn } from "@/lib/utils";
import { assigneeLabel } from "@/components/assignee/assignee-badge";
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

type FieldKey =
  | "name"
  | "siret"
  | "type"
  | "status"
  | "assignedToId"
  | "address"
  | "city"
  | "postalCode"
  | "sector"
  | "employeeRange"
  | "fleetSize"
  | "estimatedRevenue"
  | "website"
  | "linkedin";

type Choices = Record<FieldKey, "A" | "B">;

function isEmpty(value: unknown): boolean {
  return value === null || value === undefined || value === "";
}

function defaultChoice(a: unknown, b: unknown): "A" | "B" {
  return isEmpty(a) && !isEmpty(b) ? "B" : "A";
}

function buildDefaultChoices(a: CompanyMergeCandidate, b: CompanyMergeCandidate): Choices {
  return {
    name: defaultChoice(a.name, b.name),
    siret: defaultChoice(a.siret, b.siret),
    type: "A",
    status: "A",
    assignedToId: defaultChoice(a.assignedTo, b.assignedTo),
    address: defaultChoice(a.address, b.address),
    city: defaultChoice(a.city, b.city),
    postalCode: defaultChoice(a.postalCode, b.postalCode),
    sector: defaultChoice(a.sector, b.sector),
    employeeRange: defaultChoice(a.employeeRange, b.employeeRange),
    fleetSize: defaultChoice(a.fleetSize, b.fleetSize),
    estimatedRevenue: defaultChoice(a.estimatedRevenue, b.estimatedRevenue),
    website: defaultChoice(a.website, b.website),
    linkedin: defaultChoice(a.linkedin, b.linkedin),
  };
}

function FieldRow({
  label,
  valueA,
  valueB,
  selected,
  onSelect,
}: {
  label: string;
  valueA: ReactNode;
  valueB: ReactNode;
  selected: "A" | "B";
  onSelect: (side: "A" | "B") => void;
}) {
  return (
    <div className="grid grid-cols-[110px_1fr_1fr] items-stretch gap-2 border-b py-1.5 text-sm last:border-b-0">
      <span className="flex items-center text-xs font-medium text-muted-foreground">{label}</span>
      {(["A", "B"] as const).map((side) => (
        <button
          key={side}
          type="button"
          onClick={() => onSelect(side)}
          className={cn(
            "truncate rounded-md border px-2 py-1.5 text-left",
            selected === side
              ? "border-primary bg-primary/5 font-medium"
              : "text-muted-foreground hover:bg-muted"
          )}
        >
          {side === "A" ? valueA : valueB}
        </button>
      ))}
    </div>
  );
}

/**
 * Side-by-side deduplication tool: fetches both candidates, lets the user
 * pick which record survives and, field by field, which value to keep on
 * it. Confirming calls mergeCompaniesAction, which reassigns every related
 * record from the removed company onto the kept one before deleting it.
 */
export function MergeCompaniesDialog({
  companyAId,
  companyBId,
  trigger,
  open: controlledOpen,
  onOpenChange: setControlledOpen,
  onMerged,
}: {
  companyAId: string;
  companyBId: string;
  /** Pass `null` to render no trigger at all (fully parent-controlled). */
  trigger?: ReactElement | null;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onMerged: (keptId: string) => void;
}) {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : uncontrolledOpen;
  const setOpen = isControlled ? setControlledOpen! : setUncontrolledOpen;

  const [companyA, setCompanyA] = useState<CompanyMergeCandidate | null>(null);
  const [companyB, setCompanyB] = useState<CompanyMergeCandidate | null>(null);
  const [keepSide, setKeepSide] = useState<"A" | "B">("A");
  const [choices, setChoices] = useState<Choices | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    Promise.all([
      getCompanyMergeCandidateAction(companyAId),
      getCompanyMergeCandidateAction(companyBId),
    ]).then(([a, b]) => {
      if (cancelled) return;
      setCompanyA(a);
      setCompanyB(b);
      setKeepSide("A");
      setChoices(buildDefaultChoices(a, b));
    });
    return () => {
      cancelled = true;
    };
  }, [open, companyAId, companyBId]);

  function setChoice(key: FieldKey, side: "A" | "B") {
    setChoices((prev) => (prev ? { ...prev, [key]: side } : prev));
  }

  async function handleMerge() {
    if (!companyA || !companyB || !choices) return;
    setSubmitting(true);
    const keepId = keepSide === "A" ? companyA.id : companyB.id;
    const removeId = keepSide === "A" ? companyB.id : companyA.id;
    const pick = <T,>(key: FieldKey, a: T, b: T): T => (choices[key] === "A" ? a : b);

    try {
      await mergeCompaniesAction({
        keepId,
        removeId,
        fields: {
          name: pick("name", companyA.name, companyB.name),
          siret: pick("siret", companyA.siret, companyB.siret),
          type: pick("type", companyA.type, companyB.type),
          status: pick("status", companyA.status, companyB.status),
          address: pick("address", companyA.address, companyB.address),
          city: pick("city", companyA.city, companyB.city),
          postalCode: pick("postalCode", companyA.postalCode, companyB.postalCode),
          sector: pick("sector", companyA.sector, companyB.sector),
          employeeRange: pick("employeeRange", companyA.employeeRange, companyB.employeeRange),
          fleetSize: pick("fleetSize", companyA.fleetSize, companyB.fleetSize),
          estimatedRevenue: pick(
            "estimatedRevenue",
            companyA.estimatedRevenue,
            companyB.estimatedRevenue
          ),
          website: pick("website", companyA.website, companyB.website),
          linkedin: pick("linkedin", companyA.linkedin, companyB.linkedin),
          assignedToId: pick(
            "assignedToId",
            companyA.assignedTo?.id ?? null,
            companyB.assignedTo?.id ?? null
          ),
        },
      });
      toast.success("Entreprises fusionnées.");
      setOpen(false);
      onMerged(keepId);
    } catch (error) {
      toast.error("Impossible de fusionner ces entreprises.", {
        description: error instanceof Error ? error.message : undefined,
      });
    } finally {
      setSubmitting(false);
    }
  }

  const removedCounts =
    companyA && companyB ? (keepSide === "A" ? companyB : companyA)._count : null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger !== undefined && trigger !== null && <DialogTrigger render={trigger} />}
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Fusionner deux entreprises</DialogTitle>
          <DialogDescription>
            Choisis, champ par champ, l&apos;information à conserver. Les contacts, deals, tâches,
            activités, notes et véhicules de la fiche supprimée seront automatiquement réaffectés.
          </DialogDescription>
        </DialogHeader>

        {!companyA || !companyB || !choices ? (
          <div className="flex h-40 items-center justify-center">
            <Loader2 className="size-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            <div className="grid grid-cols-[110px_1fr_1fr] gap-2 text-sm">
              <span />
              {(
                [
                  { side: "A" as const, company: companyA },
                  { side: "B" as const, company: companyB },
                ] as const
              ).map(({ side, company }) => (
                <button
                  key={side}
                  type="button"
                  onClick={() => setKeepSide(side)}
                  className={cn(
                    "flex flex-col items-start gap-0.5 rounded-md border px-2 py-1.5 text-left",
                    keepSide === side
                      ? "border-primary bg-primary/5"
                      : "border-dashed text-muted-foreground hover:bg-muted"
                  )}
                >
                  <span className="truncate font-medium">{company.name}</span>
                  <span className="text-xs">
                    {keepSide === side ? "Fiche conservée" : "Sera supprimée"}
                  </span>
                </button>
              ))}
            </div>

            <div className="max-h-96 overflow-y-auto rounded-lg border px-2">
              <FieldRow
                label="Nom"
                valueA={companyA.name}
                valueB={companyB.name}
                selected={choices.name}
                onSelect={(s) => setChoice("name", s)}
              />
              <FieldRow
                label="SIRET"
                valueA={companyA.siret ?? "—"}
                valueB={companyB.siret ?? "—"}
                selected={choices.siret}
                onSelect={(s) => setChoice("siret", s)}
              />
              <FieldRow
                label="Type"
                valueA={COMPANY_TYPE_LABELS[companyA.type]}
                valueB={COMPANY_TYPE_LABELS[companyB.type]}
                selected={choices.type}
                onSelect={(s) => setChoice("type", s)}
              />
              <FieldRow
                label="Statut"
                valueA={COMPANY_STATUS_LABELS[companyA.status]}
                valueB={COMPANY_STATUS_LABELS[companyB.status]}
                selected={choices.status}
                onSelect={(s) => setChoice("status", s)}
              />
              <FieldRow
                label="Propriétaire"
                valueA={assigneeLabel(companyA.assignedTo)}
                valueB={assigneeLabel(companyB.assignedTo)}
                selected={choices.assignedToId}
                onSelect={(s) => setChoice("assignedToId", s)}
              />
              <FieldRow
                label="Adresse"
                valueA={companyA.address ?? "—"}
                valueB={companyB.address ?? "—"}
                selected={choices.address}
                onSelect={(s) => setChoice("address", s)}
              />
              <FieldRow
                label="Ville"
                valueA={companyA.city ?? "—"}
                valueB={companyB.city ?? "—"}
                selected={choices.city}
                onSelect={(s) => setChoice("city", s)}
              />
              <FieldRow
                label="Code postal"
                valueA={companyA.postalCode ?? "—"}
                valueB={companyB.postalCode ?? "—"}
                selected={choices.postalCode}
                onSelect={(s) => setChoice("postalCode", s)}
              />
              <FieldRow
                label="Secteur"
                valueA={companyA.sector ?? "—"}
                valueB={companyB.sector ?? "—"}
                selected={choices.sector}
                onSelect={(s) => setChoice("sector", s)}
              />
              <FieldRow
                label="Effectif"
                valueA={companyA.employeeRange ?? "—"}
                valueB={companyB.employeeRange ?? "—"}
                selected={choices.employeeRange}
                onSelect={(s) => setChoice("employeeRange", s)}
              />
              <FieldRow
                label="Taille flotte"
                valueA={companyA.fleetSize ?? "—"}
                valueB={companyB.fleetSize ?? "—"}
                selected={choices.fleetSize}
                onSelect={(s) => setChoice("fleetSize", s)}
              />
              <FieldRow
                label="CA estimé"
                valueA={formatCurrency(companyA.estimatedRevenue)}
                valueB={formatCurrency(companyB.estimatedRevenue)}
                selected={choices.estimatedRevenue}
                onSelect={(s) => setChoice("estimatedRevenue", s)}
              />
              <FieldRow
                label="Site web"
                valueA={companyA.website ?? "—"}
                valueB={companyB.website ?? "—"}
                selected={choices.website}
                onSelect={(s) => setChoice("website", s)}
              />
              <FieldRow
                label="LinkedIn"
                valueA={companyA.linkedin ?? "—"}
                valueB={companyB.linkedin ?? "—"}
                selected={choices.linkedin}
                onSelect={(s) => setChoice("linkedin", s)}
              />
            </div>

            {removedCounts && (
              <p className="text-xs text-muted-foreground">
                Seront réaffectés vers la fiche conservée : {removedCounts.contacts} contact
                {removedCounts.contacts > 1 ? "s" : ""}, {removedCounts.deals} deal
                {removedCounts.deals > 1 ? "s" : ""}, {removedCounts.tasks} tâche
                {removedCounts.tasks > 1 ? "s" : ""}, {removedCounts.activities} activité
                {removedCounts.activities > 1 ? "s" : ""}, {removedCounts.notes} note
                {removedCounts.notes > 1 ? "s" : ""}, {removedCounts.vehicles} véhicule
                {removedCounts.vehicles > 1 ? "s" : ""}.
              </p>
            )}
          </>
        )}

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => setOpen(false)}>
            Annuler
          </Button>
          <Button
            type="button"
            onClick={handleMerge}
            disabled={submitting || !companyA || !companyB}
          >
            {submitting ? <Loader2 className="animate-spin" /> : <GitMerge />}
            Fusionner
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
