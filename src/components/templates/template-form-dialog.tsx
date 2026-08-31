"use client";

import { useEffect, useState, type ReactElement } from "react";
import { useRouter } from "next/navigation";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Pencil, Plus } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";

import type { EmailTemplateInput } from "@/lib/actions/email-templates";
import { createEmailTemplateAction, updateEmailTemplateAction } from "@/lib/actions/email-templates";
import {
  AVAILABLE_TEMPLATE_VARIABLES,
  SAMPLE_TEMPLATE_CONTEXT,
  renderTemplate,
} from "@/lib/template-render";
import { Badge } from "@/components/ui/badge";
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
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";

const templateFormSchema = z.object({
  title: z.string().trim().min(1, "Le titre est requis."),
  subject: z.string().trim().min(1, "L'objet est requis."),
  body: z.string().trim().min(1, "Le contenu est requis."),
});

type TemplateFormValues = z.infer<typeof templateFormSchema>;

export type TemplateFormInitialData = {
  id: string;
  title: string;
  subject: string;
  body: string;
};

function toFormValues(template?: TemplateFormInitialData): TemplateFormValues {
  return {
    title: template?.title ?? "",
    subject: template?.subject ?? "",
    body: template?.body ?? "",
  };
}

export function TemplateFormDialog({
  mode,
  template,
  trigger,
  onSaved,
}: {
  mode: "create" | "edit";
  template?: TemplateFormInitialData;
  trigger?: ReactElement;
  onSaved?: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const router = useRouter();

  const form = useForm<TemplateFormValues>({
    resolver: zodResolver(templateFormSchema),
    defaultValues: toFormValues(template),
  });

  useEffect(() => {
    if (open) form.reset(toFormValues(template));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const subject = useWatch({ control: form.control, name: "subject" });
  const body = useWatch({ control: form.control, name: "body" });

  function insertVariable(token: string) {
    const current = form.getValues("body");
    form.setValue("body", `${current}${current && !current.endsWith(" ") ? " " : ""}{{${token}}}`, {
      shouldDirty: true,
    });
  }

  async function onSubmit(values: EmailTemplateInput) {
    setSubmitting(true);
    try {
      const id =
        mode === "create"
          ? await createEmailTemplateAction(values)
          : await updateEmailTemplateAction(template!.id, values);

      toast.success(mode === "create" ? "Template créé." : "Template mis à jour.");
      router.refresh();
      onSaved?.(id);
      setOpen(false);
    } catch (error) {
      toast.error("Impossible d'enregistrer le template.", {
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
        Nouveau template
      </Button>
    ) : (
      <Button size="sm" variant="ghost" aria-label="Modifier">
        <Pencil />
      </Button>
    );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={trigger ?? defaultTrigger} />
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{mode === "create" ? "Nouveau template" : "Modifier le template"}</DialogTitle>
          <DialogDescription>
            Utilise des variables comme {"{{contact.firstName}}"} — elles sont remplacées
            automatiquement à l&apos;envoi.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="template-title">Titre (interne)</Label>
                <Input
                  id="template-title"
                  placeholder="Relance après devis"
                  {...form.register("title")}
                />
                {form.formState.errors.title && (
                  <p className="text-xs text-destructive">{form.formState.errors.title.message}</p>
                )}
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="template-subject">Objet de l&apos;email</Label>
                <Input
                  id="template-subject"
                  placeholder="Votre devis {{deal.name}} chez {{company.name}}"
                  {...form.register("subject")}
                />
                {form.formState.errors.subject && (
                  <p className="text-xs text-destructive">
                    {form.formState.errors.subject.message}
                  </p>
                )}
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="template-body">Corps du message</Label>
                <Textarea
                  id="template-body"
                  rows={8}
                  placeholder="Bonjour {{contact.firstName}},"
                  {...form.register("body")}
                />
                {form.formState.errors.body && (
                  <p className="text-xs text-destructive">{form.formState.errors.body.message}</p>
                )}
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
            </div>

            <div className="flex flex-col gap-2 rounded-lg border bg-muted/30 p-3">
              <Badge variant="outline" className="w-fit">
                Aperçu (données d&apos;exemple)
              </Badge>
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground">Objet</p>
                <p className="text-sm font-medium">
                  {renderTemplate(subject || "", SAMPLE_TEMPLATE_CONTEXT) || "—"}
                </p>
              </div>
              <Separator />
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground">Message</p>
                <p className="whitespace-pre-wrap text-sm">
                  {renderTemplate(body || "", SAMPLE_TEMPLATE_CONTEXT) || "—"}
                </p>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Annuler
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting && <Loader2 className="animate-spin" />}
              {mode === "create" ? "Créer le template" : "Enregistrer"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
