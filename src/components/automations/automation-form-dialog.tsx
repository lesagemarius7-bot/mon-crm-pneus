"use client";

import { useEffect, useState, type ReactElement } from "react";
import { useRouter } from "next/navigation";
import { Controller, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Pencil, Plus } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";

import type { EmailTemplateOption } from "@/lib/queries/email-templates";
import type { AutomationInput } from "@/lib/actions/automations";
import { createAutomationAction, updateAutomationAction } from "@/lib/actions/automations";
import {
  AUTOMATION_ACTION_TYPE_LABELS,
  AUTOMATION_TRIGGER_LABELS,
  TASK_TYPE_LABELS,
} from "@/lib/labels";
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

const NO_TEMPLATE = "none";

const automationFormSchema = z.object({
  name: z.string().trim().min(1, "Le nom est requis."),
  trigger: z.enum(["DEAL_WON", "DEAL_LOST"]),
  actionType: z.enum(["CREATE_TASK", "SEND_EMAIL_TEMPLATE"]),
  delayDays: z
    .string()
    .refine((v) => v !== "" && !Number.isNaN(Number(v)) && Number(v) >= 0, "Nombre de jours invalide."),
  templateId: z.string(),
  taskSubject: z.string().trim(),
  taskType: z.string(),
  taskReason: z.string().trim(),
});

type AutomationFormValues = z.infer<typeof automationFormSchema>;

export type AutomationFormInitialData = {
  id: string;
  name: string;
  trigger: "DEAL_WON" | "DEAL_LOST";
  actionType: "CREATE_TASK" | "SEND_EMAIL_TEMPLATE";
  delayDays: number;
  templateId: string | null;
  taskSubject: string | null;
  taskType: string | null;
  taskReason: string | null;
};

function toFormValues(automation?: AutomationFormInitialData): AutomationFormValues {
  return {
    name: automation?.name ?? "",
    trigger: automation?.trigger ?? "DEAL_WON",
    actionType: automation?.actionType ?? "CREATE_TASK",
    delayDays: automation ? String(automation.delayDays) : "7",
    templateId: automation?.templateId ?? "",
    taskSubject: automation?.taskSubject ?? "Rappel suivi client",
    taskType: automation?.taskType ?? "RELANCE_EMAIL",
    taskReason: automation?.taskReason ?? "",
  };
}

export function AutomationFormDialog({
  mode,
  automation,
  templates,
  trigger,
  onSaved,
}: {
  mode: "create" | "edit";
  automation?: AutomationFormInitialData;
  templates: EmailTemplateOption[];
  trigger?: ReactElement;
  onSaved?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const router = useRouter();

  const form = useForm<AutomationFormValues>({
    resolver: zodResolver(automationFormSchema),
    defaultValues: toFormValues(automation),
  });

  useEffect(() => {
    if (open) form.reset(toFormValues(automation));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const actionType = useWatch({ control: form.control, name: "actionType" });

  async function onSubmit(values: AutomationFormValues) {
    setSubmitting(true);
    const input: AutomationInput = {
      name: values.name,
      trigger: values.trigger,
      actionType: values.actionType,
      delayDays: Number(values.delayDays),
      templateId: values.templateId === NO_TEMPLATE ? null : values.templateId || null,
      taskSubject: values.taskSubject || null,
      taskType: (values.taskType || null) as AutomationInput["taskType"],
      taskReason: values.taskReason || null,
    };

    try {
      if (mode === "create") {
        await createAutomationAction(input);
      } else {
        await updateAutomationAction(automation!.id, input);
      }

      toast.success(mode === "create" ? "Automatisation créée." : "Automatisation mise à jour.");
      router.refresh();
      onSaved?.();
      setOpen(false);
    } catch (error) {
      toast.error("Impossible d'enregistrer l'automatisation.", {
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
        Nouvelle automatisation
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
          <DialogTitle>
            {mode === "create" ? "Nouvelle automatisation" : "Modifier l'automatisation"}
          </DialogTitle>
          <DialogDescription>
            Déclenchée automatiquement quand un deal change d&apos;étape.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="automation-name">Nom</Label>
            <Input
              id="automation-name"
              placeholder="Suivi après deal gagné"
              {...form.register("name")}
            />
            {form.formState.errors.name && (
              <p className="text-xs text-destructive">{form.formState.errors.name.message}</p>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Déclencheur</Label>
            <Controller
              control={form.control}
              name="trigger"
              render={({ field }) => (
                <Select
                  value={field.value || null}
                  onValueChange={(value) =>
                    field.onChange((value as AutomationFormValues["trigger"]) ?? "DEAL_WON")
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(AUTOMATION_TRIGGER_LABELS).map(([value, label]) => (
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
            <Label>Action</Label>
            <Controller
              control={form.control}
              name="actionType"
              render={({ field }) => (
                <Select
                  value={field.value || null}
                  onValueChange={(value) =>
                    field.onChange((value as AutomationFormValues["actionType"]) ?? "CREATE_TASK")
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(AUTOMATION_ACTION_TYPE_LABELS).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          {actionType === "CREATE_TASK" ? (
            <>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="automation-task-subject">Sujet de la tâche</Label>
                <Input id="automation-task-subject" {...form.register("taskSubject")} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <Label>Type de tâche</Label>
                  <Controller
                    control={form.control}
                    name="taskType"
                    render={({ field }) => (
                      <Select
                        value={field.value || null}
                        onValueChange={(value) => field.onChange(value ?? "RELANCE_EMAIL")}
                      >
                        <SelectTrigger>
                          <SelectValue />
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
                  <Label htmlFor="automation-delay">Échéance (J+)</Label>
                  <Input
                    id="automation-delay"
                    type="number"
                    min={0}
                    {...form.register("delayDays")}
                  />
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="automation-task-reason">Raison / description</Label>
                <Textarea id="automation-task-reason" rows={2} {...form.register("taskReason")} />
              </div>
            </>
          ) : (
            <div className="flex flex-col gap-1.5">
              <Label>Template</Label>
              <Controller
                control={form.control}
                name="templateId"
                render={({ field }) => (
                  <Select
                    value={field.value || NO_TEMPLATE}
                    onValueChange={(value) => field.onChange(value ?? NO_TEMPLATE)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Choisir un template..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NO_TEMPLATE}>Aucun</SelectItem>
                      {templates.map((t) => (
                        <SelectItem key={t.id} value={t.id}>
                          {t.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              <p className="text-xs text-muted-foreground">
                Envoyé immédiatement au déclenchement (consigné dans le fil d&apos;activité).
              </p>
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Annuler
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting && <Loader2 className="animate-spin" />}
              {mode === "create" ? "Créer" : "Enregistrer"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
