"use client";

import { useEffect, useMemo, useState, type ReactElement } from "react";
import { FileText, Loader2, Send } from "lucide-react";
import { toast } from "sonner";

import type { EmailTemplateOption } from "@/lib/queries/email-templates";
import { sendEmailAction } from "@/lib/actions/activities";
import { listEmailTemplateOptionsAction } from "@/lib/actions/email-templates";
import { getCurrentUserIdAction } from "@/lib/actions/profiles";
import { renderTemplate, type TemplateContext } from "@/lib/template-render";
import { cn } from "@/lib/utils";
import { AssigneeBadge } from "@/components/assignee/assignee-badge";
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
import { Textarea } from "@/components/ui/textarea";

function TemplateListItem({
  template,
  selected,
  onPick,
}: {
  template: EmailTemplateOption;
  selected: boolean;
  onPick: (template: EmailTemplateOption) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onPick(template)}
      className={cn(
        "flex items-start gap-2 rounded-md border p-2 text-left text-xs transition-colors hover:border-primary hover:bg-primary/5",
        selected && "border-primary bg-primary/5"
      )}
    >
      <FileText className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
      <span className="min-w-0 flex-1">
        <span className="block truncate font-medium">{template.title}</span>
        <span className="block truncate text-muted-foreground">{template.subject}</span>
        <AssigneeBadge assignee={template.createdBy} className="mt-1 text-[0.65rem]" />
      </span>
    </button>
  );
}

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
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [templates, setTemplates] = useState<EmailTemplateOption[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    listEmailTemplateOptionsAction().then(setTemplates);
    getCurrentUserIdAction().then(setCurrentUserId);
  }, []);

  // Own templates surface first so the user finds them immediately,
  // without hiding the rest of the team's — just reordered, under its own
  // heading.
  const myTemplates = useMemo(
    () => templates.filter((t) => t.createdBy?.id === currentUserId),
    [templates, currentUserId]
  );
  const otherTemplates = useMemo(
    () => templates.filter((t) => t.createdBy?.id !== currentUserId),
    [templates, currentUserId]
  );

  function handlePickTemplate(template: EmailTemplateOption) {
    setSelectedTemplateId(template.id);
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
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Envoyer un email</DialogTitle>
          <DialogDescription>
            L&apos;envoi est consigné automatiquement dans le fil d&apos;activité.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-[minmax(0,1fr)_240px]">
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
                rows={10}
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Bonjour,"
              />
              {selectedTemplateId && (
                <p className="text-xs text-muted-foreground">
                  Pré-rempli depuis un template — modifiable avant l&apos;envoi.
                </p>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label className="text-xs text-muted-foreground">Templates disponibles</Label>
            <div className="flex max-h-80 flex-col gap-2.5 overflow-y-auto rounded-lg border p-1.5 sm:max-h-none sm:flex-1">
              {templates.length === 0 ? (
                <p className="p-2 text-xs text-muted-foreground">Aucun template créé.</p>
              ) : (
                <>
                  {myTemplates.length > 0 && (
                    <div className="flex flex-col gap-1.5">
                      <span className="px-1 text-[0.65rem] font-medium tracking-wide text-muted-foreground uppercase">
                        Mes templates
                      </span>
                      {myTemplates.map((template) => (
                        <TemplateListItem
                          key={template.id}
                          template={template}
                          selected={selectedTemplateId === template.id}
                          onPick={handlePickTemplate}
                        />
                      ))}
                    </div>
                  )}
                  {otherTemplates.length > 0 && (
                    <div className="flex flex-col gap-1.5">
                      <span className="px-1 text-[0.65rem] font-medium tracking-wide text-muted-foreground uppercase">
                        Autres templates
                      </span>
                      {otherTemplates.map((template) => (
                        <TemplateListItem
                          key={template.id}
                          template={template}
                          selected={selectedTemplateId === template.id}
                          onPick={handlePickTemplate}
                        />
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
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
