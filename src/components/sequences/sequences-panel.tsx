"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";

import type { SequenceRow } from "@/lib/queries/sequences";
import { deleteSequenceAction, toggleSequenceActiveAction } from "@/lib/actions/sequences";
import { formatDate } from "@/lib/labels";
import { SequenceDetailSheet } from "@/components/sequences/sequence-detail-sheet";
import { SequenceFormDialog } from "@/components/sequences/sequence-form-dialog";
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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

function ActiveToggle({ sequence }: { sequence: SequenceRow }) {
  const [pending, setPending] = useState(false);
  const router = useRouter();

  async function handleChange(checked: boolean) {
    setPending(true);
    try {
      await toggleSequenceActiveAction(sequence.id, checked);
      router.refresh();
    } catch (error) {
      toast.error("Impossible de mettre à jour le statut.", {
        description: error instanceof Error ? error.message : undefined,
      });
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
      <Switch checked={sequence.isActive} onCheckedChange={handleChange} disabled={pending} />
      <Badge variant={sequence.isActive ? "default" : "secondary"}>
        {sequence.isActive ? "Active" : "Désactivée"}
      </Badge>
    </div>
  );
}

function DeleteSequenceButton({ sequence }: { sequence: SequenceRow }) {
  const [deleting, setDeleting] = useState(false);
  const router = useRouter();

  async function handleDelete() {
    setDeleting(true);
    try {
      await deleteSequenceAction(sequence.id);
      toast.success(`Séquence « ${sequence.name} » supprimée.`);
      router.refresh();
    } catch (error) {
      toast.error("Impossible de supprimer cette séquence.", {
        description: error instanceof Error ? error.message : undefined,
      });
    } finally {
      setDeleting(false);
    }
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger render={<Button variant="ghost" size="icon-sm" aria-label="Supprimer" />}>
        <Trash2 className="text-destructive" />
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Supprimer « {sequence.name} » ?</AlertDialogTitle>
          <AlertDialogDescription>
            Les étapes et les inscriptions de contacts associées seront aussi supprimées.
            Cette action est irréversible.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Annuler</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={deleting}
            className="bg-destructive text-white hover:bg-destructive/90"
          >
            {deleting && <Loader2 className="animate-spin" />}
            Supprimer
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export function SequencesPanel({ sequences }: { sequences: SequenceRow[] }) {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  return (
    <>
      <div className="overflow-hidden rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nom</TableHead>
              <TableHead>Étapes</TableHead>
              <TableHead>Contacts actifs</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead>Créée le</TableHead>
              <TableHead className="w-24" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {sequences.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                  Aucune séquence pour le moment.
                </TableCell>
              </TableRow>
            ) : (
              sequences.map((sequence) => (
                <TableRow
                  key={sequence.id}
                  className="cursor-pointer"
                  onClick={() => setSelectedId(sequence.id)}
                >
                  <TableCell className="font-medium">{sequence.name}</TableCell>
                  <TableCell>{sequence._count.steps}</TableCell>
                  <TableCell>{sequence._count.enrollments}</TableCell>
                  <TableCell>
                    <ActiveToggle sequence={sequence} />
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatDate(sequence.createdAt)}
                  </TableCell>
                  <TableCell>
                    <div
                      className="flex items-center justify-end gap-0.5"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <SequenceFormDialog mode="edit" sequence={sequence} />
                      <DeleteSequenceButton sequence={sequence} />
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <SequenceDetailSheet
        sequenceId={selectedId}
        onOpenChange={(open) => !open && setSelectedId(null)}
      />
    </>
  );
}
