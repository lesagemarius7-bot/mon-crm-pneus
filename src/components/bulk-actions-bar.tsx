"use client";

import { useState, type ReactNode } from "react";
import { Loader2, Trash2, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Separator } from "@/components/ui/separator";

/**
 * Floating selection toolbar shown once at least one row is checked, in
 * both full-page tables and the smaller lists inside entity drawers.
 * `position="fixed"` (default) centers it at the bottom of the viewport;
 * pass "absolute" when the parent (e.g. a Sheet tab) already scopes it.
 */
export function BulkActionsBar({
  selectedCount,
  itemLabel,
  itemLabelPlural,
  warningText,
  onClear,
  onConfirmDelete,
  position = "fixed",
  extraActions,
}: {
  selectedCount: number;
  /** Singular, lowercase, e.g. "entreprise". */
  itemLabel: string;
  /** Plural, lowercase, e.g. "entreprises". */
  itemLabelPlural: string;
  /** Extra sentence appended to the confirmation dialog (cascade warnings). */
  warningText?: string;
  onClear: () => void;
  onConfirmDelete: () => Promise<void>;
  position?: "fixed" | "absolute";
  /** Extra buttons (e.g. "Ajouter à une liste") rendered before Delete. */
  extraActions?: ReactNode;
}) {
  const [deleting, setDeleting] = useState(false);

  if (selectedCount === 0) return null;

  const label = selectedCount > 1 ? itemLabelPlural : itemLabel;

  async function handleConfirm() {
    setDeleting(true);
    try {
      await onConfirmDelete();
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div
      className={`${position === "fixed" ? "fixed" : "absolute"} inset-x-0 bottom-4 z-100 flex justify-center px-4`}
    >
      <div className="flex items-center gap-3 rounded-full border bg-popover px-4 py-2 text-popover-foreground shadow-lg">
        <span className="text-sm font-medium">
          {selectedCount} {label} sélectionné{selectedCount > 1 ? "s" : ""}
        </span>
        <Separator orientation="vertical" className="h-4" />
        <Button variant="ghost" size="icon-sm" onClick={onClear} aria-label="Désélectionner">
          <X />
        </Button>
        {extraActions}
        <AlertDialog>
          <AlertDialogTrigger render={<Button variant="destructive" size="sm" />}>
            <Trash2 />
            Supprimer ({selectedCount})
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                Supprimer {selectedCount} {label} ?
              </AlertDialogTitle>
              <AlertDialogDescription>
                Cette action est irréversible.{warningText ? ` ${warningText}` : ""}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Annuler</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleConfirm}
                disabled={deleting}
                className="bg-destructive text-white hover:bg-destructive/90"
              >
                {deleting && <Loader2 className="animate-spin" />}
                Supprimer
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
