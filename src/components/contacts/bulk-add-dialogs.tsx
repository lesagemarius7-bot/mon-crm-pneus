"use client";

import { useEffect, useState } from "react";
import { ListPlus, Workflow } from "lucide-react";
import { toast } from "sonner";

import type { ContactListOption } from "@/lib/queries/contact-lists";
import type { SequenceOption } from "@/lib/queries/sequences";
import { addContactsToListAction, listContactListOptionsAction } from "@/lib/actions/contact-lists";
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

/** Bulk "Ajouter à une liste" — from the Contacts table's multi-select
 * bar. Only STATIC lists are offered (dynamic ones compute membership from
 * filters, not manual adds). */
export function BulkAddToListDialog({
  contactIds,
  onDone,
}: {
  contactIds: string[];
  onDone?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [lists, setLists] = useState<ContactListOption[] | null>(null);
  const [listId, setListId] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open && lists === null) listContactListOptionsAction().then(setLists);
  }, [open, lists]);

  async function handleSubmit() {
    if (!listId) return;
    setSubmitting(true);
    try {
      const count = await addContactsToListAction(listId, contactIds);
      toast.success(`${count} contact${count > 1 ? "s" : ""} ajouté${count > 1 ? "s" : ""} à la liste.`);
      setOpen(false);
      setListId("");
      onDone?.();
    } catch (error) {
      toast.error("Impossible d'ajouter ces contacts à la liste.", {
        description: error instanceof Error ? error.message : undefined,
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="outline" size="sm" />}>
        <ListPlus />
        Ajouter à une liste
      </DialogTrigger>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Ajouter à une liste</DialogTitle>
          <DialogDescription>
            {contactIds.length} contact{contactIds.length > 1 ? "s" : ""} sélectionné
            {contactIds.length > 1 ? "s" : ""}.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-1.5">
          <Label>Liste</Label>
          <Select value={listId || null} onValueChange={(value) => setListId(value ?? "")}>
            <SelectTrigger>
              <SelectValue placeholder="Choisir une liste..." />
            </SelectTrigger>
            <SelectContent>
              {(lists ?? []).length === 0 ? (
                <SelectItem value="none" disabled>
                  Aucune liste statique — crée-en une depuis /lists
                </SelectItem>
              ) : (
                (lists ?? []).map((list) => (
                  <SelectItem key={list.id} value={list.id}>
                    {list.name}
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => setOpen(false)}>
            Annuler
          </Button>
          <Button type="button" onClick={handleSubmit} disabled={submitting || !listId}>
            Ajouter
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** Bulk "Ajouter à une séquence" — from the Contacts table's multi-select
 * bar. Contacts already enrolled are silently skipped. */
export function BulkAddToSequenceDialog({
  contactIds,
  onDone,
}: {
  contactIds: string[];
  onDone?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [sequences, setSequences] = useState<SequenceOption[] | null>(null);
  const [sequenceId, setSequenceId] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open && sequences === null) listSequenceOptionsAction().then(setSequences);
  }, [open, sequences]);

  async function handleSubmit() {
    if (!sequenceId) return;
    setSubmitting(true);
    try {
      const count = await enrollContactsInSequenceAction(sequenceId, contactIds);
      toast.success(`${count} contact${count > 1 ? "s" : ""} inscrit${count > 1 ? "s" : ""} à la séquence.`);
      setOpen(false);
      setSequenceId("");
      onDone?.();
    } catch (error) {
      toast.error("Impossible d'inscrire ces contacts.", {
        description: error instanceof Error ? error.message : undefined,
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="outline" size="sm" />}>
        <Workflow />
        Ajouter à une séquence
      </DialogTrigger>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Ajouter à une séquence</DialogTitle>
          <DialogDescription>
            {contactIds.length} contact{contactIds.length > 1 ? "s" : ""} sélectionné
            {contactIds.length > 1 ? "s" : ""}.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-1.5">
          <Label>Séquence</Label>
          <Select value={sequenceId || null} onValueChange={(value) => setSequenceId(value ?? "")}>
            <SelectTrigger>
              <SelectValue placeholder="Choisir une séquence..." />
            </SelectTrigger>
            <SelectContent>
              {(sequences ?? []).length === 0 ? (
                <SelectItem value="none" disabled>
                  Aucune séquence active — crée-en une depuis /sequences
                </SelectItem>
              ) : (
                (sequences ?? []).map((sequence) => (
                  <SelectItem key={sequence.id} value={sequence.id}>
                    {sequence.name}
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => setOpen(false)}>
            Annuler
          </Button>
          <Button type="button" onClick={handleSubmit} disabled={submitting || !sequenceId}>
            Inscrire
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
