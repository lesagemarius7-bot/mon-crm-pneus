"use client";

import { useEffect, useState, type ReactElement } from "react";
import { Loader2, Workflow } from "lucide-react";
import { toast } from "sonner";

import type { SequenceOption } from "@/lib/queries/sequences";
import { enrollContactsInSequenceAction, listSequenceOptionsAction } from "@/lib/actions/sequences";
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
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

/**
 * "Inscrire à une séquence" — from the Company drawer, via one of its
 * linked contacts (a sequence enrolls a Contact, not a Company directly).
 * Logs an Activity (see enrollContactsInSequenceAction) so the enrollment
 * shows up in the company's timeline.
 */
export function EnrollInSequenceDialog({
  contacts,
  defaultContactId,
  trigger,
  onEnrolled,
}: {
  contacts: { id: string; firstName: string; lastName: string }[];
  defaultContactId?: string | null;
  trigger?: ReactElement;
  onEnrolled?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [sequences, setSequences] = useState<SequenceOption[] | null>(null);
  const [contactId, setContactId] = useState(defaultContactId ?? "");
  const [sequenceId, setSequenceId] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Base UI's Dialog.Popup unmounts on close, so contactId/sequenceId's
  // useState initializers already give a fresh default on every reopen —
  // this effect only needs to fetch the sequence list.
  useEffect(() => {
    if (open) listSequenceOptionsAction().then(setSequences);
  }, [open]);

  async function handleSubmit() {
    if (!contactId || !sequenceId) return;
    setSubmitting(true);
    try {
      const count = await enrollContactsInSequenceAction(sequenceId, [contactId]);
      toast.success(
        count > 0 ? "Contact inscrit à la séquence." : "Ce contact est déjà inscrit à cette séquence."
      );
      setOpen(false);
      onEnrolled?.();
    } catch (error) {
      toast.error("Impossible d'inscrire ce contact.", {
        description: error instanceof Error ? error.message : undefined,
      });
    } finally {
      setSubmitting(false);
    }
  }

  const defaultTrigger = (
    <Button variant="outline" size="sm">
      <Workflow /> Inscrire à une séquence
    </Button>
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={trigger ?? defaultTrigger} />
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Inscrire à une séquence</DialogTitle>
          <DialogDescription>
            La première étape se déclenchera selon son délai configuré.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label>Contact</Label>
            <Select value={contactId || null} onValueChange={(value) => setContactId(value ?? "")}>
              <SelectTrigger>
                <SelectValue placeholder="Choisir un contact..." />
              </SelectTrigger>
              <SelectContent>
                {contacts.length === 0 ? (
                  <SelectItem value="none" disabled>
                    Aucun contact associé à cette entreprise
                  </SelectItem>
                ) : (
                  contacts.map((contact) => (
                    <SelectItem key={contact.id} value={contact.id}>
                      {contact.firstName} {contact.lastName}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Séquence</Label>
            {sequences === null ? (
              <Loader2 className="size-4 animate-spin text-muted-foreground" />
            ) : (
              <Select value={sequenceId || null} onValueChange={(value) => setSequenceId(value ?? "")}>
                <SelectTrigger>
                  <SelectValue placeholder="Choisir une séquence..." />
                </SelectTrigger>
                <SelectContent>
                  {sequences.length === 0 ? (
                    <SelectItem value="none" disabled>
                      Aucune séquence active — crée-en une depuis /sequences
                    </SelectItem>
                  ) : (
                    sequences.map((sequence) => (
                      <SelectItem key={sequence.id} value={sequence.id}>
                        {sequence.name}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => setOpen(false)}>
            Annuler
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={submitting || !contactId || !sequenceId}
          >
            {submitting && <Loader2 className="animate-spin" />}
            Inscrire
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
