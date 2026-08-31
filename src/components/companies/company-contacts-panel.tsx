"use client";

import { useState } from "react";
import { Loader2, Mail, MoreHorizontal, Pencil, Phone, Trash2, UserMinus } from "lucide-react";
import { toast } from "sonner";

import type { CompanyDetail } from "@/lib/queries/companies";
import { deleteContactsAction, detachContactFromCompanyAction } from "@/lib/actions/contacts";
import { CONTACT_ROLE_LABELS, formatCurrency } from "@/lib/labels";
import { ContactFormDialog } from "@/components/contacts/contact-form-dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";

/**
 * Right column of the widened Company drawer/fullscreen view: contacts
 * (with per-row detach/delete) and a compact deals summary. Contacts no
 * longer live behind their own tab — they're always visible alongside the
 * activity feed.
 */
export function CompanyContactsPanel({
  detail,
  onRefetch,
}: {
  detail: CompanyDetail;
  onRefetch: () => void;
}) {
  const [busyContactId, setBusyContactId] = useState<string | null>(null);
  const [confirmContact, setConfirmContact] = useState<{ id: string; name: string } | null>(
    null
  );

  async function handleDetach(contactId: string) {
    setBusyContactId(contactId);
    try {
      await detachContactFromCompanyAction(contactId);
      toast.success("Contact détaché de l'entreprise.");
      onRefetch();
    } catch (error) {
      toast.error("Impossible de détacher ce contact.", {
        description: error instanceof Error ? error.message : undefined,
      });
    } finally {
      setBusyContactId(null);
    }
  }

  async function handleDelete(contactId: string) {
    setBusyContactId(contactId);
    try {
      await deleteContactsAction([contactId]);
      toast.success("Contact supprimé.");
      onRefetch();
    } catch (error) {
      toast.error("Impossible de supprimer ce contact.", {
        description: error instanceof Error ? error.message : undefined,
      });
    } finally {
      setBusyContactId(null);
    }
  }

  const dealsTotal = detail.deals.reduce((sum, deal) => sum + (deal.value ?? 0), 0);

  return (
    <div className="flex flex-col gap-4">
      <div>
        <div className="mb-2 flex items-center justify-between">
          <h4 className="text-sm font-medium">Contacts ({detail.contacts.length})</h4>
          <ContactFormDialog
            mode="create"
            companyId={detail.id}
            onSaved={onRefetch}
            trigger={
              <button type="button" className="text-xs text-primary hover:underline">
                + Ajouter un contact
              </button>
            }
          />
        </div>

        {detail.contacts.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aucun contact associé.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {detail.contacts.map((contact) => (
              <li key={contact.id} className="rounded-lg border p-2.5 text-sm">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate font-medium">
                      {contact.firstName} {contact.lastName}
                    </p>
                    <Badge variant="outline" className="mt-1">
                      {CONTACT_ROLE_LABELS[contact.role]}
                    </Badge>
                  </div>
                  <div className="flex shrink-0 items-center gap-0.5">
                    {busyContactId === contact.id && (
                      <Loader2 className="size-3.5 animate-spin text-muted-foreground" />
                    )}
                    <ContactFormDialog
                      mode="edit"
                      companyId={detail.id}
                      contact={contact}
                      onSaved={onRefetch}
                      trigger={
                        <Button variant="ghost" size="icon-sm" aria-label="Modifier le contact">
                          <Pencil />
                        </Button>
                      }
                    />
                    <DropdownMenu>
                      <DropdownMenuTrigger
                        render={
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            aria-label="Plus d'options"
                          />
                        }
                      >
                        <MoreHorizontal />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleDetach(contact.id)}>
                          <UserMinus /> Détacher de l&apos;entreprise
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          variant="destructive"
                          onClick={() =>
                            setConfirmContact({
                              id: contact.id,
                              name: `${contact.firstName} ${contact.lastName}`,
                            })
                          }
                        >
                          <Trash2 /> Supprimer définitivement
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
                <div className="mt-1.5 space-y-1 text-muted-foreground">
                  {contact.email && (
                    <div className="flex items-center gap-1.5">
                      <Mail className="size-3.5" /> {contact.email}
                    </div>
                  )}
                  {contact.phone && (
                    <div className="flex items-center gap-1.5">
                      <Phone className="size-3.5" /> {contact.phone}
                    </div>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <Separator />

      <div>
        <h4 className="mb-2 text-sm font-medium">Deals associés ({detail.deals.length})</h4>
        {detail.deals.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aucun deal en cours.</p>
        ) : (
          <>
            <p className="mb-2 text-xs text-muted-foreground">
              Valeur totale : {formatCurrency(dealsTotal)}
            </p>
            <ul className="flex flex-col gap-2">
              {detail.deals.slice(0, 5).map((deal) => (
                <li key={deal.id} className="rounded-lg border p-2 text-sm">
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate font-medium">{deal.name}</span>
                    <Badge variant="outline" className="shrink-0">
                      {deal.stage.name}
                    </Badge>
                  </div>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {formatCurrency(deal.value)}
                  </p>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>

      <AlertDialog
        open={confirmContact !== null}
        onOpenChange={(open) => !open && setConfirmContact(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer {confirmContact?.name} ?</AlertDialogTitle>
            <AlertDialogDescription>Cette action est irréversible.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (!confirmContact) return;
                await handleDelete(confirmContact.id);
                setConfirmContact(null);
              }}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
