"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";

import type { ContactListRow } from "@/lib/queries/contact-lists";
import { deleteContactListAction } from "@/lib/actions/contact-lists";
import { CONTACT_LIST_TYPE_LABELS, formatDate } from "@/lib/labels";
import { ListDetailSheet } from "@/components/lists/list-detail-sheet";
import { ListFormDialog } from "@/components/lists/list-form-dialog";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

function DeleteListButton({ list }: { list: ContactListRow }) {
  const [deleting, setDeleting] = useState(false);
  const router = useRouter();

  async function handleDelete() {
    setDeleting(true);
    try {
      await deleteContactListAction(list.id);
      toast.success(`Liste « ${list.name} » supprimée.`);
      router.refresh();
    } catch (error) {
      toast.error("Impossible de supprimer cette liste.", {
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
          <AlertDialogTitle>Supprimer « {list.name} » ?</AlertDialogTitle>
          <AlertDialogDescription>Cette action est irréversible.</AlertDialogDescription>
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

export function ListsPanel({ lists }: { lists: ContactListRow[] }) {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  return (
    <>
      <div className="overflow-hidden rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nom</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Contacts</TableHead>
              <TableHead>Créée le</TableHead>
              <TableHead className="w-24" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {lists.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                  Aucune liste pour le moment.
                </TableCell>
              </TableRow>
            ) : (
              lists.map((list) => (
                <TableRow key={list.id} className="cursor-pointer" onClick={() => setSelectedId(list.id)}>
                  <TableCell className="font-medium">{list.name}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{CONTACT_LIST_TYPE_LABELS[list.type]}</Badge>
                  </TableCell>
                  <TableCell>{list.type === "STATIC" ? list._count.members : "Calculé"}</TableCell>
                  <TableCell className="text-muted-foreground">{formatDate(list.createdAt)}</TableCell>
                  <TableCell>
                    <div
                      className="flex items-center justify-end gap-0.5"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <ListFormDialog mode="edit" list={list} />
                      <DeleteListButton list={list} />
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <ListDetailSheet listId={selectedId} onOpenChange={(open) => !open && setSelectedId(null)} />
    </>
  );
}
