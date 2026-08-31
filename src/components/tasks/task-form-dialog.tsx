"use client";

import { useEffect, useState, type ReactElement } from "react";
import { useRouter } from "next/navigation";
import { Controller, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Plus } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";

import type { CompanyOption } from "@/lib/queries/companies";
import type { DealOption } from "@/lib/queries/deals";
import { createTaskAction, type CreateTaskInput } from "@/lib/actions/tasks";
import { TASK_PRIORITY_LABELS, TASK_TYPE_LABELS } from "@/lib/labels";
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
import { Textarea } from "@/components/ui/textarea";

const NO_LINK = "none";

const taskFormSchema = z.object({
  subject: z.string().trim().min(1, "Le sujet est requis."),
  reason: z.string().trim(),
  type: z.string().min(1, "Choisis un type."),
  priority: z.string().min(1, "Choisis une priorité."),
  dueDate: z.string(),
  companyId: z.string(),
  contactId: z.string(),
  dealId: z.string(),
});

type TaskFormValues = z.infer<typeof taskFormSchema>;

function toISODate(date: Date): string {
  const d = new Date(date);
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 10);
}

function addDays(days: number): Date {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d;
}

function addMonths(months: number): Date {
  const d = new Date();
  d.setMonth(d.getMonth() + months);
  return d;
}

const DATE_PRESETS = [
  { label: "Demain", getDate: () => addDays(1) },
  { label: "Dans 3j", getDate: () => addDays(3) },
  { label: "1 mois", getDate: () => addMonths(1) },
  { label: "6 mois", getDate: () => addMonths(6) },
];

function defaultValues(
  fixedCompanyId: string | undefined,
  fixedContactId: string | undefined,
  fixedDealId: string | undefined
): TaskFormValues {
  return {
    subject: "",
    reason: "",
    type: "APPEL",
    priority: "NORMALE",
    dueDate: "",
    companyId: fixedCompanyId ?? NO_LINK,
    contactId: fixedContactId ?? NO_LINK,
    dealId: fixedDealId ?? NO_LINK,
  };
}

export function TaskFormDialog({
  companyId: fixedCompanyId,
  contactId: fixedContactId,
  dealId: fixedDealId,
  companies,
  deals,
  trigger,
  onCreated,
}: {
  /** Fixed context from a drawer — hides that entity's select. */
  companyId?: string;
  contactId?: string;
  dealId?: string;
  companies?: CompanyOption[];
  deals?: DealOption[];
  trigger?: ReactElement;
  onCreated?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const router = useRouter();

  const form = useForm<TaskFormValues>({
    resolver: zodResolver(taskFormSchema),
    defaultValues: defaultValues(fixedCompanyId, fixedContactId, fixedDealId),
  });

  useEffect(() => {
    if (open) {
      form.reset(defaultValues(fixedCompanyId, fixedContactId, fixedDealId));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const companyId = useWatch({ control: form.control, name: "companyId" });
  const contacts = companies?.find((c) => c.id === companyId)?.contacts ?? [];
  const dealsForCompany = (deals ?? []).filter((d) => d.companyId === companyId);

  async function onSubmit(values: TaskFormValues) {
    setSubmitting(true);
    try {
      await createTaskAction({
        subject: values.subject,
        reason: values.reason || null,
        type: values.type as CreateTaskInput["type"],
        priority: values.priority as CreateTaskInput["priority"],
        dueDate: values.dueDate ? new Date(values.dueDate) : null,
        companyId: fixedCompanyId ?? (values.companyId === NO_LINK ? null : values.companyId),
        contactId: fixedContactId ?? (values.contactId === NO_LINK ? null : values.contactId),
        dealId: fixedDealId ?? (values.dealId === NO_LINK ? null : values.dealId),
      });
      toast.success(`Tâche « ${values.subject} » créée.`);
      router.refresh();
      onCreated?.();
      setOpen(false);
    } catch (error) {
      toast.error("Impossible de créer cette tâche.", {
        description: error instanceof Error ? error.message : undefined,
      });
    } finally {
      setSubmitting(false);
    }
  }

  const defaultTrigger = (
    <Button size="sm">
      <Plus />
      Créer une tâche
    </Button>
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={trigger ?? defaultTrigger} />
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Nouvelle tâche</DialogTitle>
          <DialogDescription>
            Appel, relance, RDV ou démonstration à planifier.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="task-subject">Sujet</Label>
            <Input
              id="task-subject"
              placeholder="Relancer sur le devis pneus génie civil"
              {...form.register("subject")}
            />
            {form.formState.errors.subject && (
              <p className="text-xs text-destructive">
                {form.formState.errors.subject.message}
              </p>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="task-reason">Raison / Description</Label>
            <Textarea
              id="task-reason"
              rows={2}
              placeholder="Contexte, détails utiles..."
              {...form.register("reason")}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="task-due-date">Date d&apos;échéance</Label>
            <Input id="task-due-date" type="date" {...form.register("dueDate")} />
            <div className="flex flex-wrap gap-1.5">
              {DATE_PRESETS.map((preset) => (
                <Button
                  key={preset.label}
                  type="button"
                  variant="outline"
                  size="xs"
                  onClick={() =>
                    form.setValue("dueDate", toISODate(preset.getDate()), {
                      shouldValidate: true,
                    })
                  }
                >
                  {preset.label}
                </Button>
              ))}
            </div>
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
                    onValueChange={(value) => field.onChange(value ?? "APPEL")}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Choisir..." />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(TASK_TYPE_LABELS).map(([value, label]) => (
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
              <Label>Priorité</Label>
              <Controller
                control={form.control}
                name="priority"
                render={({ field }) => (
                  <Select
                    value={field.value || null}
                    onValueChange={(value) => field.onChange(value ?? "NORMALE")}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Choisir..." />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(TASK_PRIORITY_LABELS).map(([value, label]) => (
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
                      field.onChange(value ?? NO_LINK);
                      form.setValue("contactId", NO_LINK);
                      form.setValue("dealId", NO_LINK);
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Aucune" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NO_LINK}>Aucune</SelectItem>
                      {(companies ?? []).map((company) => (
                        <SelectItem key={company.id} value={company.id}>
                          {company.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
          )}

          {!fixedContactId && (
            <div className="flex flex-col gap-1.5">
              <Label>Contact</Label>
              <Controller
                control={form.control}
                name="contactId"
                render={({ field }) => (
                  <Select
                    value={field.value || null}
                    onValueChange={(value) => field.onChange(value ?? NO_LINK)}
                    disabled={!fixedCompanyId && companyId === NO_LINK}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Aucun" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NO_LINK}>Aucun</SelectItem>
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
          )}

          {!fixedDealId && (
            <div className="flex flex-col gap-1.5">
              <Label>Deal</Label>
              <Controller
                control={form.control}
                name="dealId"
                render={({ field }) => (
                  <Select
                    value={field.value || null}
                    onValueChange={(value) => field.onChange(value ?? NO_LINK)}
                    disabled={!fixedCompanyId && companyId === NO_LINK}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Aucun" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NO_LINK}>Aucun</SelectItem>
                      {dealsForCompany.map((deal) => (
                        <SelectItem key={deal.id} value={deal.id}>
                          {deal.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Annuler
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting && <Loader2 className="animate-spin" />}
              Créer la tâche
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
