"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, Trash2, UserPlus } from "lucide-react";
import { toast } from "sonner";

import type { ContactOption } from "@/lib/queries/contacts";
import type { ContactListDetail } from "@/lib/queries/contact-lists";
import { listContactOptionsAction } from "@/lib/actions/contacts";
import {
  addContactsToListAction,
  getContactListDetailAction,
  removeContactFromListAction,
} from "@/lib/actions/contact-lists";
import { CONTACT_LIST_TYPE_LABELS } from "@/lib/labels";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

export function ListDetailSheet({
  listId,
  onOpenChange,
}: {
  listId: string | null;
  onOpenChange: (open: boolean) => void;
}) {
  const [detail, setDetail] = useState<ContactListDetail | null>(null);
  const [loadedForId, setLoadedForId] = useState<string | null>(null);
  const [contactOptions, setContactOptions] = useState<ContactOption[]>([]);
  const [addingContactId, setAddingContactId] = useState("");
  const [adding, setAdding] = useState(false);

  const refetch = useCallback(() => {
    if (!listId) return;
    getContactListDetailAction(listId).then((result) => {
      setDetail(result);
      setLoadedForId(listId);
    });
  }, [listId]);

  useEffect(() => {
    if (!listId) return;
    let cancelled = false;
    Promise.all([getContactListDetailAction(listId), listContactOptionsAction()]).then(
      ([result, options]) => {
        if (!cancelled) {
          setDetail(result);
          setLoadedForId(listId);
          setContactOptions(options);
        }
      }
    );
    return () => {
      cancelled = true;
    };
  }, [listId]);

  const loading = listId !== null && loadedForId !== listId;

  async function handleAdd() {
    if (!detail || !addingContactId) return;
    setAdding(true);
    try {
      await addContactsToListAction(detail.id, [addingContactId]);
      setAddingContactId("");
      refetch();
    } catch (error) {
      toast.error("Impossible d'ajouter ce contact.", {
        description: error instanceof Error ? error.message : undefined,
      });
    } finally {
      setAdding(false);
    }
  }

  async function handleRemove(membershipId: string) {
    try {
      await removeContactFromListAction(membershipId);
      toast.success("Contact retiré de la liste.");
      refetch();
    } catch (error) {
      toast.error("Impossible de retirer ce contact.", {
        description: error instanceof Error ? error.message : undefined,
      });
    }
  }

  const availableContacts = detail
    ? contactOptions.filter((c) => !detail.members.some((m) => m.id === c.id))
    : [];

  return (
    <Sheet open={!!listId} onOpenChange={onOpenChange}>
      <SheetContent className="w-full gap-0 overflow-y-auto sm:max-w-lg">
        {loading || !detail ? (
          <div className="flex h-full items-center justify-center">
            <Loader2 className="size-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            <SheetHeader className="gap-2 border-b pb-4">
              <div className="flex items-center gap-2">
                <SheetTitle>{detail.name}</SheetTitle>
                <Badge variant="outline">{CONTACT_LIST_TYPE_LABELS[detail.type]}</Badge>
              </div>
              <SheetDescription>
                {detail.members.length} contact{detail.members.length > 1 ? "s" : ""}
                {detail.type === "DYNAMIC" && " — calculés selon les filtres de la liste"}
              </SheetDescription>
            </SheetHeader>

            <div className="flex flex-col gap-4 p-4">
              {detail.type === "STATIC" && (
                <div className="flex items-center gap-2">
                  <Select
                    value={addingContactId || null}
                    onValueChange={(value) => setAddingContactId(value ?? "")}
                  >
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="Choisir un contact à ajouter..." />
                    </SelectTrigger>
                    <SelectContent>
                      {availableContacts.length === 0 ? (
                        <SelectItem value="none" disabled>
                          Tous les contacts sont déjà dans la liste
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
                  <Button size="sm" onClick={handleAdd} disabled={adding || !addingContactId}>
                    {adding ? <Loader2 className="animate-spin" /> : <UserPlus />}
                    Ajouter
                  </Button>
                </div>
              )}

              {detail.members.length === 0 ? (
                <p className="text-sm text-muted-foreground">Aucun contact dans cette liste.</p>
              ) : (
                <ul className="flex flex-col gap-2">
                  {detail.members.map((member) => (
                    <li
                      key={member.id}
                      className="flex items-center justify-between gap-2 rounded-lg border p-2.5 text-sm"
                    >
                      <div className="min-w-0">
                        <p className="truncate font-medium">
                          {member.firstName} {member.lastName}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {member.company?.name ?? "—"}
                        </p>
                      </div>
                      {detail.type === "STATIC" && member.membershipId && (
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          aria-label="Retirer de la liste"
                          onClick={() => handleRemove(member.membershipId!)}
                        >
                          <Trash2 className="text-destructive" />
                        </Button>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
