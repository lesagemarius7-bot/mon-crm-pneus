"use client";

import { useEffect, useState, type ReactElement } from "react";
import { useRouter } from "next/navigation";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Pencil, Plus } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";

import type { CompanyOption } from "@/lib/queries/companies";
import type { ContactFormInput } from "@/lib/actions/contacts";
import { createContactAction, updateContactAction } from "@/lib/actions/contacts";
import { CONTACT_ROLE_LABELS } from "@/lib/labels";
import { CustomFieldsEditor } from "@/components/custom-fields/custom-fields-editor";
import { EntityTasksSection } from "@/components/tasks/entity-tasks-section";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";

const contactFormSchema = z.object({
  firstName: z.string().trim().min(1, "Le prénom est requis."),
  lastName: z.string().trim().min(1, "Le nom est requis."),
  email: z
    .string()
    .trim()
    .refine((v) => v === "" || z.email().safeParse(v).success, "Email invalide."),
  phone: z.string().trim(),
  role: z.string().min(1, "Choisis un rôle."),
  companyId: z.string().min(1, "Entreprise requise."),
});

type ContactFormValues = z.infer<typeof contactFormSchema>;

export type ContactFormInitialData = {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  role: string;
  companyId: string | null;
  customFields?: unknown;
};

function toFormValues(
  contact: ContactFormInitialData | undefined,
  fixedCompanyId: string | undefined
): ContactFormValues {
  return {
    firstName: contact?.firstName ?? "",
    lastName: contact?.lastName ?? "",
    email: contact?.email ?? "",
    phone: contact?.phone ?? "",
    role: contact?.role ?? "AUTRE",
    companyId: fixedCompanyId ?? contact?.companyId ?? "",
  };
}

export function ContactFormDialog({
  mode,
  companyId: fixedCompanyId,
  companies,
  contact,
  trigger,
  open: controlledOpen,
  onOpenChange: setControlledOpen,
  onSaved,
}: {
  mode: "create" | "edit";
  /** Fixed company context (e.g. the Company drawer) — hides the company select. */
  companyId?: string;
  /** Required when companyId isn't fixed, to populate the company select. */
  companies?: CompanyOption[];
  contact?: ContactFormInitialData;
  /** Pass `null` to render no trigger at all (fully parent-controlled). */
  trigger?: ReactElement | null;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onSaved?: (id: string) => void;
}) {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const router = useRouter();

  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : uncontrolledOpen;
  const setOpen = isControlled ? setControlledOpen! : setUncontrolledOpen;

  const form = useForm<ContactFormValues>({
    resolver: zodResolver(contactFormSchema),
    defaultValues: toFormValues(contact, fixedCompanyId),
  });

  useEffect(() => {
    if (open) form.reset(toFormValues(contact, fixedCompanyId));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  async function onSubmit(values: ContactFormValues) {
    setSubmitting(true);
    const input: ContactFormInput = {
      firstName: values.firstName,
      lastName: values.lastName,
      email: values.email || null,
      phone: values.phone || null,
      role: values.role as ContactFormInput["role"],
      companyId: fixedCompanyId ?? values.companyId,
    };

    try {
      const id =
        mode === "create"
          ? await createContactAction(input)
          : await updateContactAction(contact!.id, input);

      toast.success(mode === "create" ? "Contact ajouté." : "Contact mis à jour.");
      router.refresh();
      onSaved?.(id);
      setOpen(false);
    } catch (error) {
      toast.error("Impossible d'enregistrer le contact.", {
        description: error instanceof Error ? error.message : undefined,
      });
    } finally {
      setSubmitting(false);
    }
  }

  const defaultTrigger =
    mode === "create" ? (
      <Button size="sm" variant="outline">
        <Plus />
        Ajouter un contact
      </Button>
    ) : (
      <Button size="icon-xs" variant="ghost" aria-label="Modifier le contact">
        <Pencil />
      </Button>
    );

  const resolvedTrigger = trigger === null ? null : (trigger ?? defaultTrigger);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {resolvedTrigger && <DialogTrigger render={resolvedTrigger} />}
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {mode === "create" ? "Nouveau contact" : "Modifier le contact"}
          </DialogTitle>
          <DialogDescription>
            {mode === "create"
              ? "Ajoute un interlocuteur pour cette entreprise."
              : "Met à jour les informations de ce contact."}
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="flex flex-col gap-4"
        >
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="contact-first-name">Prénom</Label>
              <Input
                id="contact-first-name"
                placeholder="Sophie"
                {...form.register("firstName")}
              />
              {form.formState.errors.firstName && (
                <p className="text-xs text-destructive">
                  {form.formState.errors.firstName.message}
                </p>
              )}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="contact-last-name">Nom</Label>
              <Input
                id="contact-last-name"
                placeholder="Dubois"
                {...form.register("lastName")}
              />
              {form.formState.errors.lastName && (
                <p className="text-xs text-destructive">
                  {form.formState.errors.lastName.message}
                </p>
              )}
            </div>
          </div>

          {!fixedCompanyId && (
            <div className="flex flex-col gap-1.5">
              <Label>Entreprise</Label>
              <Controller
                control={form.control}
                name="companyId"
                render={({ field }) => (
                  <Select
                    value={field.value || null}
                    onValueChange={(value) => field.onChange(value ?? "")}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Choisir..." />
                    </SelectTrigger>
                    <SelectContent>
                      {(companies ?? []).map((company) => (
                        <SelectItem key={company.id} value={company.id}>
                          {company.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {form.formState.errors.companyId && (
                <p className="text-xs text-destructive">
                  {form.formState.errors.companyId.message}
                </p>
              )}
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="contact-email">Email</Label>
            <Input
              id="contact-email"
              type="email"
              placeholder="sophie.dubois@entreprise.fr"
              {...form.register("email")}
            />
            {form.formState.errors.email && (
              <p className="text-xs text-destructive">
                {form.formState.errors.email.message}
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="contact-phone">Téléphone</Label>
              <Input
                id="contact-phone"
                placeholder="06 12 34 56 78"
                {...form.register("phone")}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label>Rôle</Label>
              <Controller
                control={form.control}
                name="role"
                render={({ field }) => (
                  <Select
                    value={field.value || null}
                    onValueChange={(value) => field.onChange(value ?? "")}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Choisir..." />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(CONTACT_ROLE_LABELS).map(([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Annuler
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting && <Loader2 className="animate-spin" />}
              {mode === "create" ? "Ajouter" : "Enregistrer"}
            </Button>
          </DialogFooter>
        </form>

        {mode === "edit" && contact && (
          <>
            <Separator />
            <div>
              <h4 className="mb-2 text-sm font-medium">Champs personnalisés</h4>
              <CustomFieldsEditor
                entity="CONTACT"
                entityId={contact.id}
                initialValues={contact.customFields}
              />
            </div>

            <Separator />
            <div>
              <h4 className="mb-2 text-sm font-medium">Activités &amp; Suivi</h4>
              <EntityTasksSection contactId={contact.id} />
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
