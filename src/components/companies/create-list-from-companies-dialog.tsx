"use client";

import { useState } from "react";
import { FolderPlus } from "lucide-react";
import { toast } from "sonner";

import { createListFromCompaniesAction } from "@/lib/actions/contact-lists";
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

/**
 * "Créer une liste" — from the Companies table's multi-select bar.
 * ContactList only holds contacts, so this creates a STATIC list and
 * auto-enrolls every contact attached to the selected companies.
 */
export function CreateListFromCompaniesDialog({
  companyIds,
  onDone,
}: {
  companyIds: string[];
  onDone?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    if (!name.trim()) return;
    setSubmitting(true);
    try {
      const { contactCount } = await createListFromCompaniesAction(name, companyIds);
      toast.success(
        `Liste « ${name.trim()} » créée avec ${contactCount} contact${contactCount > 1 ? "s" : ""}.`
      );
      setOpen(false);
      setName("");
      onDone?.();
    } catch (error) {
      toast.error("Impossible de créer la liste.", {
        description: error instanceof Error ? error.message : undefined,
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="outline" size="sm" />}>
        <FolderPlus />
        Créer une liste
      </DialogTrigger>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Créer une liste</DialogTitle>
          <DialogDescription>
            {companyIds.length} entreprise{companyIds.length > 1 ? "s" : ""} sélectionnée
            {companyIds.length > 1 ? "s" : ""} — tous leurs contacts seront ajoutés à la liste.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="new-list-name">Nom de la liste</Label>
          <Input
            id="new-list-name"
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Clients BTP région Lyon"
          />
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => setOpen(false)}>
            Annuler
          </Button>
          <Button type="button" onClick={handleSubmit} disabled={submitting || !name.trim()}>
            Créer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
