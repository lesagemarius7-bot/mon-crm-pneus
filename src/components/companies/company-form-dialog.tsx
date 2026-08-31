"use client";

import { useEffect, useState, type ReactElement } from "react";
import { useRouter } from "next/navigation";
import { Controller, useForm, useWatch, type Control } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Pencil, Plus } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";

import type { CompanyFormInput } from "@/lib/actions/companies";
import { createCompanyAction, updateCompanyAction } from "@/lib/actions/companies";
import { COMPANY_STATUS_LABELS, COMPANY_TYPE_LABELS } from "@/lib/labels";
import { AssigneeSelect } from "@/components/assignee/assignee-select";
import { CompanySireneSearch } from "@/components/companies/company-sirene-search";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const numberFieldSchema = z
  .string()
  .refine(
    (v) => v === "" || (!Number.isNaN(Number(v)) && Number(v) >= 0),
    "Doit être un nombre positif."
  );

const companyFormSchema = z.object({
  name: z.string().trim().min(1, "Le nom est requis."),
  siret: z.string().trim(),
  type: z.string().min(1, "Choisis un type."),
  status: z.string().min(1, "Choisis un statut."),
  fleetSize: numberFieldSchema,
  estimatedRevenue: numberFieldSchema,
  assignedToId: z.string().nullable(),
  address: z.string().nullable(),
  city: z.string().nullable(),
  postalCode: z.string().nullable(),
  sector: z.string().nullable(),
  employeeRange: z.string().nullable(),
  linkedin: z.string().nullable(),
});

type CompanyFormValues = z.infer<typeof companyFormSchema>;

export type CompanyFormInitialData = {
  id: string;
  name: string;
  siret: string | null;
  type: string;
  status: string;
  fleetSize: number | null;
  estimatedRevenue: number | null;
  assignedToId?: string | null;
};

function toFormValues(company?: CompanyFormInitialData): CompanyFormValues {
  return {
    name: company?.name ?? "",
    siret: company?.siret ?? "",
    type: company?.type ?? "AUTRE",
    status: company?.status ?? "PROSPECT",
    fleetSize: company?.fleetSize?.toString() ?? "",
    estimatedRevenue: company?.estimatedRevenue?.toString() ?? "",
    assignedToId: company?.assignedToId ?? null,
    address: null,
    city: null,
    postalCode: null,
    sector: null,
    employeeRange: null,
    linkedin: null,
  };
}

/** Read-only recap of the fields pre-filled by CompanySireneSearch —
 * shown only once a suggestion has been picked (create mode). */
function CompanyEnrichmentRecap({ control }: { control: Control<CompanyFormValues> }) {
  const address = useWatch({ control, name: "address" });
  const city = useWatch({ control, name: "city" });
  const postalCode = useWatch({ control, name: "postalCode" });
  const sector = useWatch({ control, name: "sector" });
  const employeeRange = useWatch({ control, name: "employeeRange" });
  const linkedin = useWatch({ control, name: "linkedin" });

  const hasAny = address || city || postalCode || sector || employeeRange || linkedin;
  if (!hasAny) return null;

  const addressLine = [address, postalCode, city].filter(Boolean).join(", ");

  return (
    <div className="flex flex-col gap-1 rounded-lg border bg-muted/30 p-2.5 text-xs text-muted-foreground">
      {addressLine && <p>Adresse : {addressLine}</p>}
      {sector && <p>Secteur d&apos;activité : {sector}</p>}
      {employeeRange && <p>Effectif : {employeeRange}</p>}
      {linkedin && (
        <p>
          LinkedIn (suggestion) :{" "}
          <a
            href={linkedin}
            target="_blank"
            rel="noreferrer"
            className="text-primary hover:underline"
          >
            {linkedin}
          </a>
        </p>
      )}
    </div>
  );
}

export function CompanyFormDialog({
  mode,
  company,
  trigger,
  onSaved,
}: {
  mode: "create" | "edit";
  company?: CompanyFormInitialData;
  trigger?: ReactElement;
  onSaved?: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const router = useRouter();

  const form = useForm<CompanyFormValues>({
    resolver: zodResolver(companyFormSchema),
    defaultValues: toFormValues(company),
  });

  useEffect(() => {
    if (open) form.reset(toFormValues(company));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  async function onSubmit(values: CompanyFormValues) {
    setSubmitting(true);
    const input: CompanyFormInput = {
      name: values.name,
      siret: values.siret || null,
      type: values.type as CompanyFormInput["type"],
      status: values.status as CompanyFormInput["status"],
      fleetSize: values.fleetSize === "" ? null : Number(values.fleetSize),
      estimatedRevenue:
        values.estimatedRevenue === "" ? null : Number(values.estimatedRevenue),
      assignedToId: values.assignedToId,
      address: values.address,
      city: values.city,
      postalCode: values.postalCode,
      sector: values.sector,
      employeeRange: values.employeeRange,
      linkedin: values.linkedin,
    };

    try {
      const id =
        mode === "create"
          ? await createCompanyAction(input)
          : await updateCompanyAction(company!.id, input);

      toast.success(mode === "create" ? "Entreprise créée." : "Entreprise mise à jour.");
      router.refresh();
      onSaved?.(id);
      setOpen(false);
    } catch (error) {
      toast.error("Impossible d'enregistrer l'entreprise.", {
        description: error instanceof Error ? error.message : undefined,
      });
    } finally {
      setSubmitting(false);
    }
  }

  const defaultTrigger =
    mode === "create" ? (
      <Button size="sm">
        <Plus />
        Nouvelle entreprise
      </Button>
    ) : (
      <Button size="sm" variant="outline">
        <Pencil />
        Modifier
      </Button>
    );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={trigger ?? defaultTrigger} />
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {mode === "create" ? "Nouvelle entreprise" : "Modifier l'entreprise"}
          </DialogTitle>
          <DialogDescription>
            Compte client, prospect ou partenaire de la flotte.
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="flex flex-col gap-4"
        >
          {mode === "create" && (
            <CompanySireneSearch
              onPick={(suggestion) => {
                if (!suggestion) {
                  form.setValue("address", null);
                  form.setValue("city", null);
                  form.setValue("postalCode", null);
                  form.setValue("sector", null);
                  form.setValue("employeeRange", null);
                  form.setValue("linkedin", null);
                  return;
                }
                form.setValue("name", suggestion.name, { shouldValidate: true });
                if (suggestion.siret) form.setValue("siret", suggestion.siret);
                form.setValue("address", suggestion.address);
                form.setValue("city", suggestion.city);
                form.setValue("postalCode", suggestion.postalCode);
                form.setValue("sector", suggestion.sector);
                form.setValue("employeeRange", suggestion.employeeRange);
                form.setValue("linkedin", suggestion.linkedin);
              }}
            />
          )}

          {mode === "create" && <CompanyEnrichmentRecap control={form.control} />}

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="company-name">Nom</Label>
            <Input
              id="company-name"
              placeholder="Transports Lefèvre & Fils"
              {...form.register("name")}
            />
            {form.formState.errors.name && (
              <p className="text-xs text-destructive">
                {form.formState.errors.name.message}
              </p>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="company-siret">SIRET</Label>
            <Input
              id="company-siret"
              placeholder="41234567800012"
              {...form.register("siret")}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label>Type</Label>
              <Controller
                control={form.control}
                name="type"
                render={({ field }) => (
                  <Select
                    value={field.value || null}
                    onValueChange={(value) => field.onChange(value ?? "")}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Choisir..." />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(COMPANY_TYPE_LABELS).map(([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label>Statut client</Label>
              <Controller
                control={form.control}
                name="status"
                render={({ field }) => (
                  <Select
                    value={field.value || null}
                    onValueChange={(value) => field.onChange(value ?? "")}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Choisir..." />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(COMPANY_STATUS_LABELS).map(([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Propriétaire / Assigné à</Label>
            <Controller
              control={form.control}
              name="assignedToId"
              render={({ field }) => (
                <AssigneeSelect value={field.value} onChange={field.onChange} />
              )}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="company-fleet-size">Taille de flotte</Label>
              <Input
                id="company-fleet-size"
                type="number"
                min={0}
                placeholder="0"
                {...form.register("fleetSize")}
              />
              {form.formState.errors.fleetSize && (
                <p className="text-xs text-destructive">
                  {form.formState.errors.fleetSize.message}
                </p>
              )}
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="company-revenue">CA estimé (€)</Label>
              <Input
                id="company-revenue"
                type="number"
                min={0}
                step="1000"
                placeholder="0"
                {...form.register("estimatedRevenue")}
              />
              {form.formState.errors.estimatedRevenue && (
                <p className="text-xs text-destructive">
                  {form.formState.errors.estimatedRevenue.message}
                </p>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Annuler
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting && <Loader2 className="animate-spin" />}
              {mode === "create" ? "Créer l'entreprise" : "Enregistrer"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
