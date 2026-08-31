"use client";

import { useEffect, useState, type ReactElement } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Pencil, Plus } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";

import type { TaskType } from "@/generated/prisma/enums";
import type { EmailTemplateOption } from "@/lib/queries/email-templates";
import { listEmailTemplateOptionsAction } from "@/lib/actions/email-templates";
import { createSequenceStepAction, updateSequenceStepAction } from "@/lib/actions/sequences";
import { TASK_TYPE_LABELS } from "@/lib/labels";
import { AVAILABLE_TEMPLATE_VARIABLES } from "@/lib/template-render";
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
import { TemplateFormDialog } from "@/components/templates/template-form-dialog";

const ACTIONS = [
  { value: "SEND_EMAIL", label: "Envoyer un email" },
  { value: "CREATE_TASK", label: "Créer une tâche" },
] as const;

const EMAIL_SOURCES = [
  { value: "TEMPLATE", label: "Utiliser un template existant" },
  { value: "CUSTOM", label: "Écrire un email personnalisé" },
] as const;

const NO_TEMPLATE = "none";

const stepFormSchema = z.object({
  delayDays: z
    .string()
    .refine((v) => v !== "" && !Number.isNaN(Number(v)) && Number(v) >= 0, "Nombre de jours invalide."),
  action: z.enum(["SEND_EMAIL", "CREATE_TASK"]),
  emailSource: z.enum(["TEMPLATE", "CUSTOM"]),
  templateId: z.string(),
  emailSubject: z.string().trim(),
  emailBody: z.string().trim(),
  taskSubject: z.string().trim(),
  taskType: z.string(),
  taskReason: z.string().trim(),
});

type StepFormValues = z.infer<typeof stepFormSchema>;

export type SequenceStepFormInitialData = {
  id: string;
  order: number;
  delayDays: number;
  action: "SEND_EMAIL" | "CREATE_TASK";
  emailSource: "TEMPLATE" | "CUSTOM";
  templateId: string | null;
  emailSubject: string | null;
  emailBody: string | null;
  taskSubject: string | null;
  taskType: string | null;
  taskReason: string | null;
};

function toFormValues(step?: SequenceStepFormInitialData): StepFormValues {
  return {
    delayDays: step ? String(step.delayDays) : "0",
    action: step?.action ?? "SEND_EMAIL",
    emailSource: step?.emailSource ?? "TEMPLATE",
    templateId: step?.templateId ?? "",
    emailSubject: step?.emailSubject ?? "",
    emailBody: step?.emailBody ?? "",
    taskSubject: step?.taskSubject ?? "",
    taskType: step?.taskType ?? "RELANCE_EMAIL",
    taskReason: step?.taskReason ?? "",
  };
}

export function SequenceStepFormDialog({
  mode,
  sequenceId,
  nextOrder,
  step,
  trigger,
  onSaved,
}: {
  mode: "create" | "edit";
  sequenceId: string;
  /** Order assigned to a new step — ignored in edit mode. */
  nextOrder?: number;
  step?: SequenceStepFormInitialData;
  trigger?: ReactElement;
  onSaved?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [templates, setTemplates] = useState<EmailTemplateOption[]>([]);

  const form = useForm<StepFormValues>({
    resolver: zodResolver(stepFormSchema),
    defaultValues: toFormValues(step),
  });

  useEffect(() => {
    if (open) {
      form.reset(toFormValues(step));
      listEmailTemplateOptionsAction().then(setTemplates);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const action = useWatch({ control: form.control, name: "action" });
  const emailSource = useWatch({ control: form.control, name: "emailSource" });

  function refreshTemplates() {
    listEmailTemplateOptionsAction().then(setTemplates);
  }

  function insertVariable(token: string) {
    const current = form.getValues("emailBody");
    form.setValue(
      "emailBody",
      `${current}${current && !current.endsWith(" ") ? " " : ""}{{${token}}}`,
      { shouldDirty: true }
    );
  }

  async function onSubmit(values: StepFormValues) {
    setSubmitting(true);
    try {
      const input = {
        sequenceId,
        order: mode === "create" ? (nextOrder ?? 1) : step!.order,
        delayDays: Number(values.delayDays),
        action: values.action,
        emailSource: values.emailSource,
        templateId: values.templateId === NO_TEMPLATE ? null : values.templateId || null,
        emailSubject: values.emailSubject || null,
        emailBody: values.emailBody || null,
        taskSubject: values.taskSubject || null,
        taskType: (values.taskType || null) as TaskType | null,
        taskReason: values.taskReason || null,
      };

      if (mode === "create") {
        await createSequenceStepAction(input);
      } else {
        await updateSequenceStepAction(step!.id, input);
      }

      toast.success(mode === "create" ? "Étape ajoutée." : "Étape mise à jour.");
      onSaved?.();
      setOpen(false);
    } catch (error) {
      toast.error("Impossible d'enregistrer l'étape.", {
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
        Ajouter une étape
      </Button>
    ) : (
      <Button size="sm" variant="ghost" aria-label="Modifier l'étape">
        <Pencil />
      </Button>
    );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={trigger ?? defaultTrigger} />
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{mode === "create" ? "Nouvelle étape" : "Modifier l'étape"}</DialogTitle>
          <DialogDescription>
            Le délai s&apos;applique après l&apos;étape précédente (ou après l&apos;inscription
            pour la première étape).
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="step-delay">Attendre (jours)</Label>
            <Input id="step-delay" type="number" min={0} {...form.register("delayDays")} />
            {form.formState.errors.delayDays && (
              <p className="text-xs text-destructive">{form.formState.errors.delayDays.message}</p>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Action</Label>
            <Controller
              control={form.control}
              name="action"
              render={({ field }) => (
                <Select
                  value={field.value || null}
                  onValueChange={(value) => field.onChange((value as StepFormValues["action"]) ?? "SEND_EMAIL")}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ACTIONS.map((a) => (
                      <SelectItem key={a.value} value={a.value}>
                        {a.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          {action === "SEND_EMAIL" ? (
            <>
              <div className="flex flex-col gap-1.5">
                <Label>Contenu de l&apos;email</Label>
                <Controller
                  control={form.control}
                  name="emailSource"
                  render={({ field }) => (
                    <Select
                      value={field.value || null}
                      onValueChange={(value) =>
                        field.onChange((value as StepFormValues["emailSource"]) ?? "TEMPLATE")
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {EMAIL_SOURCES.map((s) => (
                          <SelectItem key={s.value} value={s.value}>
                            {s.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>

              {emailSource === "TEMPLATE" ? (
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between">
                    <Label>Template</Label>
                    <TemplateFormDialog
                      mode="create"
                      onSaved={(id) => {
                        refreshTemplates();
                        form.setValue("templateId", id, { shouldDirty: true });
                      }}
                      trigger={
                        <button
                          type="button"
                          className="text-xs text-primary hover:underline"
                        >
                          + Créer un nouveau template
                        </button>
                      }
                    />
                  </div>
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
                </div>
              ) : (
                <>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="step-email-subject">Objet de l&apos;email</Label>
                    <Input
                      id="step-email-subject"
                      placeholder="Suivi de votre demande {{company.name}}"
                      {...form.register("emailSubject")}
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="step-email-body">Message</Label>
                    <Textarea
                      id="step-email-body"
                      rows={5}
                      placeholder="Bonjour {{contact.firstName}},"
                      {...form.register("emailBody")}
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label className="text-xs text-muted-foreground">Insérer une variable</Label>
                    <div className="flex flex-wrap gap-1.5">
                      {AVAILABLE_TEMPLATE_VARIABLES.map((token) => (
                        <button
                          key={token}
                          type="button"
                          onClick={() => insertVariable(token)}
                          className="rounded-md border border-dashed px-1.5 py-0.5 font-mono text-xs text-muted-foreground hover:border-primary hover:text-primary"
                        >
                          {`{{${token}}}`}
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </>
          ) : (
            <>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="step-task-subject">Sujet de la tâche</Label>
                <Input
                  id="step-task-subject"
                  placeholder="Rappel suivi client"
                  {...form.register("taskSubject")}
                />
              </div>
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
                <Label htmlFor="step-task-reason">Raison / description</Label>
                <Textarea id="step-task-reason" rows={2} {...form.register("taskReason")} />
              </div>
            </>
          )}

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
      </DialogContent>
    </Dialog>
  );
}
