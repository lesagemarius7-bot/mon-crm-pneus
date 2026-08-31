"use client";

import { useEffect, useState } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { CalendarIcon, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";

import type { CompanyOption } from "@/lib/queries/companies";
import type { BoardDeal } from "@/lib/queries/deals";
import type { PipelineStage } from "@/generated/prisma/client";
import { createDealAction } from "@/lib/actions/deals";
import { formatDate } from "@/lib/labels";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const NO_CONTACT = "none";

const dealFormSchema = z.object({
  name: z.string().trim().min(1, "Le nom du deal est requis."),
  companyId: z.string().min(1, "Choisis une entreprise."),
  contactId: z.string(),
  stageId: z.string().min(1, "Choisis une étape."),
  // Kept as the raw <input type="number"> string to avoid the zod
  // input/output type split that z.preprocess/z.coerce introduce with
  // react-hook-form's single-generic useForm — converted to a number by
  // hand in onSubmit instead.
  value: z
    .string()
    .refine(
      (v) => v === "" || (!Number.isNaN(Number(v)) && Number(v) >= 0),
      "Doit être un nombre positif."
    ),
  proposedBrand: z.string().trim(),
  expectedCloseDate: z.date().optional(),
});

type DealFormValues = z.infer<typeof dealFormSchema>;

function emptyValues(stageId: string, companyId = ""): DealFormValues {
  return {
    name: "",
    companyId,
    contactId: NO_CONTACT,
    stageId,
    value: "",
    proposedBrand: "",
    expectedCloseDate: undefined,
  };
}

export function NewDealDialog({
  open,
  onOpenChange,
  stages,
  companies,
  /** Fixed company context (e.g. the Company drawer) — hides the company
   * select and pre-fills companyId, mirroring ContactFormDialog/
   * TaskFormDialog's fixed-context pattern. */
  fixedCompanyId,
  /** Contacts for `fixedCompanyId`, used instead of deriving from
   * `companies` when the company select is hidden. */
  contacts: fixedContacts,
  defaultStageId,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  stages: PipelineStage[];
  companies?: CompanyOption[];
  fixedCompanyId?: string;
  contacts?: { id: string; firstName: string; lastName: string }[];
  defaultStageId?: string;
  onCreated: (deal: BoardDeal) => void;
}) {
  const [submitting, setSubmitting] = useState(false);

  const form = useForm<DealFormValues>({
    resolver: zodResolver(dealFormSchema),
    defaultValues: emptyValues(defaultStageId ?? stages[0]?.id ?? "", fixedCompanyId),
  });

  // Re-seed the form whenever the dialog reopens (e.g. a different
  // column's "+" was clicked while it was closed).
  useEffect(() => {
    if (open) {
      form.reset(emptyValues(defaultStageId ?? stages[0]?.id ?? "", fixedCompanyId));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, defaultStageId, fixedCompanyId]);

  const companyId = useWatch({ control: form.control, name: "companyId" });
  const contacts = fixedCompanyId
    ? (fixedContacts ?? [])
    : (companies?.find((c) => c.id === companyId)?.contacts ?? []);

  async function onSubmit(values: DealFormValues) {
    setSubmitting(true);
    try {
      const deal = await createDealAction({
        name: values.name,
        companyId: values.companyId,
        contactId: values.contactId === NO_CONTACT ? null : values.contactId,
        stageId: values.stageId,
        value: values.value === "" ? null : Number(values.value),
        proposedBrand: values.proposedBrand || null,
        expectedCloseDate: values.expectedCloseDate ?? null,
      });
      onCreated(deal);
      toast.success(`Deal « ${deal.name} » créé.`);
      onOpenChange(false);
    } catch (error) {
      toast.error("Impossible de créer le deal.", {
        description: error instanceof Error ? error.message : undefined,
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Nouveau deal</DialogTitle>
          <DialogDescription>
            Ajoute une opportunité au pipeline.
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="flex flex-col gap-4"
        >
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="deal-name">Nom du deal</Label>
            <Input
              id="deal-name"
              placeholder="Renouvellement flotte — Transports Lefèvre"
              {...form.register("name")}
            />
            {form.formState.errors.name && (
              <p className="text-xs text-destructive">
                {form.formState.errors.name.message}
              </p>
            )}
          </div>

          <div className={fixedCompanyId ? undefined : "grid grid-cols-2 gap-3"}>
            {!fixedCompanyId && (
              <div className="flex flex-col gap-1.5">
                <Label>Entreprise</Label>
                <Controller
                  control={form.control}
                  name="companyId"
                  render={({ field }) => (
                    <Select
                      value={field.value || null}
                      onValueChange={(value) => {
                        field.onChange(value ?? "");
                        form.setValue("contactId", NO_CONTACT);
                      }}
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

            <div className="flex flex-col gap-1.5">
              <Label>Contact</Label>
              <Controller
                control={form.control}
                name="contactId"
                render={({ field }) => (
                  <Select
                    value={field.value || NO_CONTACT}
                    onValueChange={(value) => field.onChange(value ?? NO_CONTACT)}
                    disabled={!companyId}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Aucun" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NO_CONTACT}>Aucun</SelectItem>
                      {contacts.map((contact) => (
                        <SelectItem key={contact.id} value={contact.id}>
                          {contact.firstName} {contact.lastName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="deal-value">Valeur estimée (€)</Label>
              <Input
                id="deal-value"
                type="number"
                min={0}
                step="100"
                placeholder="0"
                {...form.register("value")}
              />
              {form.formState.errors.value && (
                <p className="text-xs text-destructive">
                  {form.formState.errors.value.message}
                </p>
              )}
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="deal-brand">Marque / produit proposé</Label>
              <Input
                id="deal-brand"
                placeholder="Michelin"
                {...form.register("proposedBrand")}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label>Étape</Label>
              <Controller
                control={form.control}
                name="stageId"
                render={({ field }) => (
                  <Select
                    value={field.value || null}
                    onValueChange={(value) => field.onChange(value ?? "")}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Choisir..." />
                    </SelectTrigger>
                    <SelectContent>
                      {stages.map((stage) => (
                        <SelectItem key={stage.id} value={stage.id}>
                          {stage.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {form.formState.errors.stageId && (
                <p className="text-xs text-destructive">
                  {form.formState.errors.stageId.message}
                </p>
              )}
            </div>

            <div className="flex flex-col gap-1.5">
              <Label>Clôture estimée</Label>
              <Controller
                control={form.control}
                name="expectedCloseDate"
                render={({ field }) => (
                  <Popover>
                    <PopoverTrigger
                      render={
                        <Button
                          type="button"
                          variant="outline"
                          className={cn(
                            "justify-start font-normal",
                            !field.value && "text-muted-foreground"
                          )}
                        />
                      }
                    >
                      <CalendarIcon className="size-3.5" />
                      {field.value ? formatDate(field.value) : "Choisir..."}
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={field.onChange}
                      />
                    </PopoverContent>
                  </Popover>
                )}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Annuler
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting && <Loader2 className="animate-spin" />}
              Créer le deal
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
