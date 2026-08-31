"use client";

import { useEffect, useState, type ReactElement } from "react";
import { useRouter } from "next/navigation";
import { Controller, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Pencil, Plus } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";

import type { CompanyStatus, CompanyType } from "@/generated/prisma/enums";
import type { ContactListInput } from "@/lib/actions/contact-lists";
import { createContactListAction, updateContactListAction } from "@/lib/actions/contact-lists";
import { COMPANY_STATUS_LABELS, COMPANY_TYPE_LABELS, CONTACT_LIST_TYPE_LABELS } from "@/lib/labels";
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

const NO_FILTER = "any";

const listFormSchema = z.object({
  name: z.string().trim().min(1, "Le nom est requis."),
  type: z.enum(["STATIC", "DYNAMIC"]),
  companyStatus: z.string(),
  companyType: z.string(),
  minDealValue: z
    .string()
    .refine((v) => v === "" || (!Number.isNaN(Number(v)) && Number(v) >= 0), "Doit être un nombre positif."),
});

type ListFormValues = z.infer<typeof listFormSchema>;

export type ListFormInitialData = {
  id: string;
  name: string;
  type: "STATIC" | "DYNAMIC";
  filters: unknown;
};

function toFormValues(list?: ListFormInitialData): ListFormValues {
  const filters = (list?.filters ?? {}) as {
    companyStatus?: string;
    companyType?: string;
    minDealValue?: number;
  };
  return {
    name: list?.name ?? "",
    type: list?.type ?? "STATIC",
    companyStatus: filters.companyStatus ?? NO_FILTER,
    companyType: filters.companyType ?? NO_FILTER,
    minDealValue: filters.minDealValue?.toString() ?? "",
  };
}

export function ListFormDialog({
  mode,
  list,
  trigger,
  onSaved,
}: {
  mode: "create" | "edit";
  list?: ListFormInitialData;
  trigger?: ReactElement;
  onSaved?: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const router = useRouter();

  const form = useForm<ListFormValues>({
    resolver: zodResolver(listFormSchema),
    defaultValues: toFormValues(list),
  });

  useEffect(() => {
    if (open) form.reset(toFormValues(list));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const type = useWatch({ control: form.control, name: "type" });

  async function onSubmit(values: ListFormValues) {
    setSubmitting(true);
    const input: ContactListInput = {
      name: values.name,
      type: values.type,
      filters:
        values.type === "DYNAMIC"
          ? {
              companyStatus:
                values.companyStatus === NO_FILTER
                  ? null
                  : (values.companyStatus as CompanyStatus),
              companyType:
                values.companyType === NO_FILTER ? null : (values.companyType as CompanyType),
              minDealValue: values.minDealValue === "" ? null : Number(values.minDealValue),
            }
          : null,
    };

    try {
      const id =
        mode === "create"
          ? await createContactListAction(input)
          : await updateContactListAction(list!.id, input);

      toast.success(mode === "create" ? "Liste créée." : "Liste mise à jour.");
      router.refresh();
      onSaved?.(id);
      setOpen(false);
    } catch (error) {
      toast.error("Impossible d'enregistrer la liste.", {
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
        Nouvelle liste
      </Button>
    ) : (
      <Button size="sm" variant="ghost" aria-label="Modifier">
        <Pencil />
      </Button>
    );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={trigger ?? defaultTrigger} />
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{mode === "create" ? "Nouvelle liste" : "Modifier la liste"}</DialogTitle>
          <DialogDescription>
            Statique : ajout manuel de contacts. Dynamique : membres calculés depuis des filtres.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="list-name">Nom</Label>
            <Input id="list-name" placeholder="Clients actifs BTP" {...form.register("name")} />
            {form.formState.errors.name && (
              <p className="text-xs text-destructive">{form.formState.errors.name.message}</p>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Type</Label>
            <Controller
              control={form.control}
              name="type"
              render={({ field }) => (
                <Select
                  value={field.value || null}
                  onValueChange={(value) =>
                    field.onChange((value as ListFormValues["type"]) ?? "STATIC")
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(CONTACT_LIST_TYPE_LABELS).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          {type === "DYNAMIC" && (
            <div className="flex flex-col gap-3 rounded-lg border bg-muted/30 p-3">
              <div className="flex flex-col gap-1.5">
                <Label>Statut de l&apos;entreprise</Label>
                <Controller
                  control={form.control}
                  name="companyStatus"
                  render={({ field }) => (
                    <Select
                      value={field.value || NO_FILTER}
                      onValueChange={(value) => field.onChange(value ?? NO_FILTER)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={NO_FILTER}>Peu importe</SelectItem>
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

              <div className="flex flex-col gap-1.5">
                <Label>Secteur (type d&apos;entreprise)</Label>
                <Controller
                  control={form.control}
                  name="companyType"
                  render={({ field }) => (
                    <Select
                      value={field.value || NO_FILTER}
                      onValueChange={(value) => field.onChange(value ?? NO_FILTER)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={NO_FILTER}>Peu importe</SelectItem>
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
                <Label htmlFor="list-min-deal">Montant de deal minimum (€)</Label>
                <Input
                  id="list-min-deal"
                  type="number"
                  min={0}
                  placeholder="0"
                  {...form.register("minDealValue")}
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Annuler
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting && <Loader2 className="animate-spin" />}
              {mode === "create" ? "Créer la liste" : "Enregistrer"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
