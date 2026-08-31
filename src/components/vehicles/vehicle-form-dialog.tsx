"use client";

import { useEffect, useState, type ReactElement } from "react";
import { useRouter } from "next/navigation";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Pencil, Plus } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";

import type { CompanyOption } from "@/lib/queries/companies";
import type { VehicleFormInput } from "@/lib/actions/vehicles";
import { createVehicleAction, updateVehicleAction } from "@/lib/actions/vehicles";
import { TIRE_TYPE_LABELS } from "@/lib/labels";
import { CustomFieldsEditor } from "@/components/custom-fields/custom-fields-editor";
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
import { Separator } from "@/components/ui/separator";

const numberFieldSchema = z
  .string()
  .refine(
    (v) => v === "" || (!Number.isNaN(Number(v)) && Number(v) >= 0),
    "Doit être un nombre positif."
  );

const vehicleFormSchema = z.object({
  label: z.string().trim().min(1, "Le nom est requis."),
  registrationPlate: z.string().trim(),
  tireType: z.string().min(1, "Choisis un type."),
  tireDimension: z.string().trim().min(1, "La dimension de pneu est requise."),
  currentBrand: z.string().trim(),
  preferredBrand: z.string().trim(),
  renewalFrequencyMonths: numberFieldSchema,
  companyId: z.string().min(1, "Entreprise requise."),
});

type VehicleFormValues = z.infer<typeof vehicleFormSchema>;

export type VehicleFormInitialData = {
  id: string;
  label: string;
  registrationPlate: string | null;
  tireType: string;
  tireDimension: string;
  currentBrand: string | null;
  preferredBrand: string | null;
  renewalFrequencyMonths: number | null;
  companyId: string;
  customFields?: unknown;
};

function toFormValues(
  vehicle: VehicleFormInitialData | undefined,
  fixedCompanyId: string | undefined
): VehicleFormValues {
  return {
    label: vehicle?.label ?? "",
    registrationPlate: vehicle?.registrationPlate ?? "",
    tireType: vehicle?.tireType ?? "POIDS_LOURDS",
    tireDimension: vehicle?.tireDimension ?? "",
    currentBrand: vehicle?.currentBrand ?? "",
    preferredBrand: vehicle?.preferredBrand ?? "",
    renewalFrequencyMonths: vehicle?.renewalFrequencyMonths?.toString() ?? "",
    companyId: fixedCompanyId ?? vehicle?.companyId ?? "",
  };
}

export function VehicleFormDialog({
  mode,
  companyId: fixedCompanyId,
  companies,
  vehicle,
  trigger,
  open: controlledOpen,
  onOpenChange: setControlledOpen,
  onSaved,
}: {
  mode: "create" | "edit";
  /** Fixed company context (e.g. the Company drawer) — hides the company select. */
  companyId?: string;
  /** Required when companyId isn't fixed, to populate the company select. */
  companies?: CompanyOption[];
  vehicle?: VehicleFormInitialData;
  /** Pass `null` to render no trigger at all (fully parent-controlled). */
  trigger?: ReactElement | null;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onSaved?: (id: string) => void;
}) {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const router = useRouter();

  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : uncontrolledOpen;
  const setOpen = isControlled ? setControlledOpen! : setUncontrolledOpen;

  const form = useForm<VehicleFormValues>({
    resolver: zodResolver(vehicleFormSchema),
    defaultValues: toFormValues(vehicle, fixedCompanyId),
  });

  useEffect(() => {
    if (open) form.reset(toFormValues(vehicle, fixedCompanyId));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  async function onSubmit(values: VehicleFormValues) {
    setSubmitting(true);
    const input: VehicleFormInput = {
      label: values.label,
      registrationPlate: values.registrationPlate || null,
      tireType: values.tireType as VehicleFormInput["tireType"],
      tireDimension: values.tireDimension,
      tireQuantity: null,
      currentBrand: values.currentBrand || null,
      preferredBrand: values.preferredBrand || null,
      renewalFrequencyMonths:
        values.renewalFrequencyMonths === ""
          ? null
          : Number(values.renewalFrequencyMonths),
      companyId: fixedCompanyId ?? values.companyId,
    };

    try {
      const id =
        mode === "create"
          ? await createVehicleAction(input)
          : await updateVehicleAction(vehicle!.id, input);

      toast.success(mode === "create" ? "Véhicule ajouté." : "Véhicule mis à jour.");
      router.refresh();
      onSaved?.(id);
      setOpen(false);
    } catch (error) {
      toast.error("Impossible d'enregistrer le véhicule.", {
        description: error instanceof Error ? error.message : undefined,
      });
    } finally {
      setSubmitting(false);
    }
  }

  const defaultTrigger =
    mode === "create" ? (
      <Button size="sm" variant="outline">
        <Plus />
        Ajouter un véhicule
      </Button>
    ) : (
      <Button size="icon-xs" variant="ghost" aria-label="Modifier le véhicule">
        <Pencil />
      </Button>
    );

  const resolvedTrigger = trigger === null ? null : (trigger ?? defaultTrigger);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {resolvedTrigger && <DialogTrigger render={resolvedTrigger} />}
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {mode === "create" ? "Nouveau véhicule" : "Modifier le véhicule"}
          </DialogTitle>
          <DialogDescription>
            Machine ou véhicule de la flotte, avec ses pneus.
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="flex flex-col gap-4"
        >
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="vehicle-label">Nom</Label>
              <Input
                id="vehicle-label"
                placeholder="Chargeuse Caterpillar 930"
                {...form.register("label")}
              />
              {form.formState.errors.label && (
                <p className="text-xs text-destructive">
                  {form.formState.errors.label.message}
                </p>
              )}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="vehicle-plate">Immatriculation</Label>
              <Input
                id="vehicle-plate"
                placeholder="AB-123-CD"
                {...form.register("registrationPlate")}
              />
            </div>
          </div>

          {!fixedCompanyId && (
            <div className="flex flex-col gap-1.5">
              <Label>Entreprise</Label>
              <Controller
                control={form.control}
                name="companyId"
                render={({ field }) => (
                  <Select
                    value={field.value || null}
                    onValueChange={(value) => field.onChange(value ?? "")}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Choisir..." />
                    </SelectTrigger>
                    <SelectContent>
                      {(companies ?? []).map((company) => (
                        <SelectItem key={company.id} value={company.id}>
                          {company.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {form.formState.errors.companyId && (
                <p className="text-xs text-destructive">
                  {form.formState.errors.companyId.message}
                </p>
              )}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label>Type de pneu</Label>
              <Controller
                control={form.control}
                name="tireType"
                render={({ field }) => (
                  <Select
                    value={field.value || null}
                    onValueChange={(value) => field.onChange(value ?? "")}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Choisir..." />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(TIRE_TYPE_LABELS).map(([value, label]) => (
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
              <Label htmlFor="vehicle-dimension">Dimensions de pneus</Label>
              <Input
                id="vehicle-dimension"
                placeholder="315/80 R22.5"
                {...form.register("tireDimension")}
              />
              {form.formState.errors.tireDimension && (
                <p className="text-xs text-destructive">
                  {form.formState.errors.tireDimension.message}
                </p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="vehicle-current-brand">Marque actuelle</Label>
              <Input
                id="vehicle-current-brand"
                placeholder="Michelin"
                {...form.register("currentBrand")}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="vehicle-preferred-brand">Marque préférée</Label>
              <Input
                id="vehicle-preferred-brand"
                placeholder="Michelin"
                {...form.register("preferredBrand")}
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="vehicle-renewal">
              Fréquence de renouvellement (mois)
            </Label>
            <Input
              id="vehicle-renewal"
              type="number"
              min={0}
              placeholder="18"
              {...form.register("renewalFrequencyMonths")}
            />
            {form.formState.errors.renewalFrequencyMonths && (
              <p className="text-xs text-destructive">
                {form.formState.errors.renewalFrequencyMonths.message}
              </p>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Annuler
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting && <Loader2 className="animate-spin" />}
              {mode === "create" ? "Ajouter" : "Enregistrer"}
            </Button>
          </DialogFooter>
        </form>

        {mode === "edit" && vehicle && (
          <>
            <Separator />
            <div>
              <h4 className="mb-2 text-sm font-medium">Champs personnalisés</h4>
              <CustomFieldsEditor
                entity="VEHICLE"
                entityId={vehicle.id}
                initialValues={vehicle.customFields}
              />
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
