"use client";

import { useEffect, useState, type ReactElement } from "react";
import { Loader2, Send } from "lucide-react";
import { toast } from "sonner";

import type { EmailTemplateOption } from "@/lib/queries/email-templates";
import { sendEmailAction } from "@/lib/actions/activities";
import { listEmailTemplateOptionsAction } from "@/lib/actions/email-templates";
import { renderTemplate, type TemplateContext } from "@/lib/template-render";
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

/**
 * There's no outbound mail provider wired up — "sending" logs a completed
 * EMAIL activity via sendEmailAction, which is enough to keep the timeline
 * accurate without a real inbox integration.
 */
export function SendEmailDialog({
  companyId,
  contactId,
  dealId,
  defaultTo,
  /** Used to render {{contact.firstName}}/{{company.name}}/{{deal.amount}}
   * when a template is picked — e.g. the open company + its primary
   * contact + most recent deal. */
  templateContext,
  trigger,
  onSent,
}: {
  companyId?: string;
  contactId?: string;
  dealId?: string;
  defaultTo?: string | null;
  templateContext?: TemplateContext;
  trigger: ReactElement;
  onSent?: () => void;
}) {
  const [open, setOpen] = useState(false);
  // Base UI's Dialog.Popup unmounts on close (keepMounted defaults to
  // false), so these reset to fresh initial values on every reopen without
  // needing a synchronizing effect.
  const [to, setTo] = useState(defaultTo ?? "");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [templateId, setTemplateId] = useState(NO_TEMPLATE);
  const [templates, setTemplates] = useState<EmailTemplateOption[]>([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    listEmailTemplateOptionsAction().then(setTemplates);
  }, []);

  function handleTemplateChange(value: string) {
    setTemplateId(value);
    const template = templates.find((t) => t.id === value);
    if (!template) return;
    setSubject(renderTemplate(template.subject, templateContext ?? {}));
    setBody(renderTemplate(template.body, templateContext ?? {}));
  }

  async function handleSend() {
    setSubmitting(true);
    try {
      await sendEmailAction({ to, subject, body, companyId, contactId, dealId });
      toast.success("Email envoyé et consigné dans le fil d'activité.");
      setOpen(false);
      onSent?.();
    } catch (error) {
      toast.error("Impossible d'envoyer l'email.", {
        description: error instanceof Error ? error.message : undefined,
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={trigger} />
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Envoyer un email</DialogTitle>
          <DialogDescription>
            L&apos;envoi est consigné automatiquement dans le fil d&apos;activité.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="send-email-to">À</Label>
            <Input
              id="send-email-to"
              type="email"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              placeholder="contact@entreprise.fr"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Template</Label>
            <Select
              value={templateId}
              onValueChange={(value) => handleTemplateChange(value ?? NO_TEMPLATE)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NO_TEMPLATE}>Aucun (rédaction libre)</SelectItem>
                {templates.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {templateId !== NO_TEMPLATE && (
              <p className="text-xs text-muted-foreground">
                Objet et message pré-remplis — modifiables avant l&apos;envoi.
              </p>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="send-email-subject">Objet</Label>
            <Input
              id="send-email-subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Suivi de votre demande"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="send-email-body">Message</Label>
            <Textarea
              id="send-email-body"
              rows={6}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Bonjour,"
            />
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => setOpen(false)}>
            Annuler
          </Button>
          <Button
            type="button"
            onClick={handleSend}
            disabled={submitting || !to.trim() || !subject.trim() || !body.trim()}
          >
            {submitting ? <Loader2 className="animate-spin" /> : <Send />}
            Envoyer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
