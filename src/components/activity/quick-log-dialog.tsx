"use client";

import { useState, type ReactElement } from "react";
import { Loader2, Send } from "lucide-react";
import { toast } from "sonner";

import { createActivityAction } from "@/lib/actions/activities";
import { createNoteAction } from "@/lib/actions/notes";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

type QuickEntryType = "NOTE" | "APPEL" | "RENDEZ_VOUS" | "EMAIL";

const QUICK_ENTRY_OPTIONS: { value: QuickEntryType; label: string }[] = [
  { value: "NOTE", label: "Note" },
  { value: "APPEL", label: "Appel" },
  { value: "RENDEZ_VOUS", label: "Rendez-vous" },
  { value: "EMAIL", label: "Email" },
];

/**
 * Header-level "+ Note / Appel" quick action — logs a note or activity
 * from anywhere in the drawer, independent of which center-column tab is
 * active. Mirrors ActivityTimeline's own quick-entry form.
 */
export function QuickLogDialog({
  companyId,
  dealId,
  trigger,
  onSaved,
}: {
  companyId?: string;
  dealId?: string;
  trigger: ReactElement;
  onSaved?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [entryType, setEntryType] = useState<QuickEntryType>("NOTE");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    const content = text.trim();
    if (!content) return;

    setSubmitting(true);
    try {
      if (entryType === "NOTE") {
        await createNoteAction({ content, companyId, dealId });
      } else {
        await createActivityAction({
          type: entryType,
          description: content,
          companyId,
          dealId,
        });
      }
      toast.success("Ajouté au fil d'activité.");
      setText("");
      setEntryType("NOTE");
      setOpen(false);
      onSaved?.();
    } catch (error) {
      toast.error("Impossible d'enregistrer.", {
        description: error instanceof Error ? error.message : undefined,
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={trigger} />
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Ajouter une note ou une activité</DialogTitle>
          <DialogDescription>
            Consigner un échange ou une note interne dans le fil d&apos;activité.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-3">
          <Select
            value={entryType}
            onValueChange={(value) => setEntryType((value as QuickEntryType) ?? "NOTE")}
          >
            <SelectTrigger className="h-8 w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {QUICK_ENTRY_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Rédiger une note ou consigner une activité..."
            rows={4}
          />
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => setOpen(false)}>
            Annuler
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={submitting || !text.trim()}
          >
            {submitting ? <Loader2 className="animate-spin" /> : <Send />}
            Enregistrer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
