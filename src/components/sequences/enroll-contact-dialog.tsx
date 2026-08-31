"use client";

import { useEffect, useState, type ReactElement } from "react";
import { Loader2, UserPlus } from "lucide-react";
import { toast } from "sonner";

import type { ContactOption } from "@/lib/queries/contacts";
import { listContactOptionsAction } from "@/lib/actions/contacts";
import { enrollContactsInSequenceAction } from "@/lib/actions/sequences";
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

export function EnrollContactDialog({
  sequenceId,
  alreadyEnrolledIds,
  trigger,
  onEnrolled,
}: {
  sequenceId: string;
  alreadyEnrolledIds: string[];
  trigger?: ReactElement;
  onEnrolled?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [contacts, setContacts] = useState<ContactOption[] | null>(null);
  const [contactId, setContactId] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open && contacts === null) {
      listContactOptionsAction().then(setContacts);
    }
  }, [open, contacts]);

  async function handleSubmit() {
    if (!contactId) return;
    setSubmitting(true);
    try {
      await enrollContactsInSequenceAction(sequenceId, [contactId]);
      toast.success("Contact inscrit à la séquence.");
      setContactId("");
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

  const availableContacts = (contacts ?? []).filter((c) => !alreadyEnrolledIds.includes(c.id));

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          trigger ?? (
            <Button size="sm" variant="outline">
              <UserPlus />
              Inscrire un contact
            </Button>
          )
        }
      />
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Inscrire un contact</DialogTitle>
          <DialogDescription>
            La première étape de la séquence se déclenchera selon son délai configuré.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-1.5">
          <Label>Contact</Label>
          {contacts === null ? (
            <Loader2 className="size-4 animate-spin text-muted-foreground" />
          ) : (
            <Select value={contactId || null} onValueChange={(value) => setContactId(value ?? "")}>
              <SelectTrigger>
                <SelectValue placeholder="Choisir un contact..." />
              </SelectTrigger>
              <SelectContent>
                {availableContacts.length === 0 ? (
                  <SelectItem value="none" disabled>
                    Tous les contacts sont déjà inscrits
                  </SelectItem>
                ) : (
                  availableContacts.map((contact) => (
                    <SelectItem key={contact.id} value={contact.id}>
                      {contact.firstName} {contact.lastName}
                      {contact.company ? ` — ${contact.company.name}` : ""}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          )}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => setOpen(false)}>
            Annuler
          </Button>
          <Button type="button" onClick={handleSubmit} disabled={submitting || !contactId}>
            {submitting && <Loader2 className="animate-spin" />}
            Inscrire
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
