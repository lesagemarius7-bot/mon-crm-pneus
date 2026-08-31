"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Controller, useFieldArray, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";

import { createCustomFieldAction } from "@/lib/actions/custom-fields";
import { CUSTOM_FIELD_ENTITY_LABELS, CUSTOM_FIELD_TYPE_LABELS } from "@/lib/labels";
import { slugify } from "@/lib/slugify";
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
import { Switch } from "@/components/ui/switch";

// The UI intentionally only exposes the 5 field types requested — the
// schema's CustomFieldType enum has a few more (URL, EMAIL, PHONE,
// CURRENCY, MULTI_SELECT) reserved for later.
const FIELD_TYPES = ["TEXT", "NUMBER", "SELECT", "DATE", "BOOLEAN"] as const;
const ENTITIES = ["COMPANY", "CONTACT", "DEAL", "VEHICLE"] as const;

const customFieldFormSchema = z.object({
  label: z.string().trim().min(1, "Le libellé est requis."),
  key: z
    .string()
    .trim()
    .min(1, "La clé est requise.")
    .regex(/^[a-z0-9_]+$/, "Lettres minuscules, chiffres et _ uniquement."),
  entity: z.enum(ENTITIES),
  fieldType: z.enum(FIELD_TYPES),
  required: z.boolean(),
  options: z.array(z.object({ value: z.string().trim().min(1, "Option vide.") })),
});

type CustomFieldFormValues = z.infer<typeof customFieldFormSchema>;

export function CustomFieldFormDialog({
  defaultEntity,
  onCreated,
}: {
  defaultEntity: (typeof ENTITIES)[number];
  onCreated?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [keyTouched, setKeyTouched] = useState(false);
  const router = useRouter();

  const form = useForm<CustomFieldFormValues>({
    resolver: zodResolver(customFieldFormSchema),
    defaultValues: {
      label: "",
      key: "",
      entity: defaultEntity,
      fieldType: "TEXT",
      required: false,
      options: [{ value: "" }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "options",
  });

  const fieldType = useWatch({ control: form.control, name: "fieldType" });

  function resetForm() {
    setKeyTouched(false);
    form.reset({
      label: "",
      key: "",
      entity: defaultEntity,
      fieldType: "TEXT",
      required: false,
      options: [{ value: "" }],
    });
  }

  async function onSubmit(values: CustomFieldFormValues) {
    setSubmitting(true);
    try {
      await createCustomFieldAction({
        label: values.label,
        key: values.key,
        entity: values.entity,
        fieldType: values.fieldType,
        required: values.required,
        options:
          values.fieldType === "SELECT"
            ? values.options.map((o) => o.value).filter(Boolean)
            : undefined,
      });
      toast.success(`Champ « ${values.label} » créé.`);
      router.refresh();
      onCreated?.();
      setOpen(false);
      resetForm();
    } catch (error) {
      toast.error("Impossible de créer ce champ.", {
        description: error instanceof Error ? error.message : undefined,
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) resetForm();
      }}
    >
      <DialogTrigger
        render={
          <Button size="sm">
            <Plus />
            Ajouter un champ
          </Button>
        }
      />
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Nouveau champ personnalisé</DialogTitle>
          <DialogDescription>
            Ajoute un attribut personnalisé, sans migration de base de données.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="field-label">Libellé</Label>
            <Input
              id="field-label"
              placeholder="Numéro de flotte interne"
              {...form.register("label", {
                onChange: (e) => {
                  if (!keyTouched) {
                    form.setValue("key", slugify(e.target.value), {
                      shouldValidate: true,
                    });
                  }
                },
              })}
            />
            {form.formState.errors.label && (
              <p className="text-xs text-destructive">
                {form.formState.errors.label.message}
              </p>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="field-key">Clé technique</Label>
            <Input
              id="field-key"
              className="font-mono"
              placeholder="numero_de_flotte_interne"
              {...form.register("key", {
                onChange: () => setKeyTouched(true),
              })}
            />
            {form.formState.errors.key && (
              <p className="text-xs text-destructive">
                {form.formState.errors.key.message}
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label>Entité cible</Label>
              <Controller
                control={form.control}
                name="entity"
                render={({ field }) => (
                  <Select
                    value={field.value}
                    onValueChange={(value) =>
                      field.onChange((value as typeof field.value) ?? defaultEntity)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ENTITIES.map((entity) => (
                        <SelectItem key={entity} value={entity}>
                          {CUSTOM_FIELD_ENTITY_LABELS[entity]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label>Type</Label>
              <Controller
                control={form.control}
                name="fieldType"
                render={({ field }) => (
                  <Select
                    value={field.value}
                    onValueChange={(value) =>
                      field.onChange((value as typeof field.value) ?? "TEXT")
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {FIELD_TYPES.map((type) => (
                        <SelectItem key={type} value={type}>
                          {CUSTOM_FIELD_TYPE_LABELS[type]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
          </div>

          {fieldType === "SELECT" && (
            <div className="flex flex-col gap-1.5">
              <Label>Options</Label>
              <div className="flex flex-col gap-2">
                {fields.map((optionField, index) => (
                  <div key={optionField.id} className="flex items-center gap-2">
                    <Input
                      placeholder={`Option ${index + 1}`}
                      {...form.register(`options.${index}.value` as const)}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => remove(index)}
                      disabled={fields.length === 1}
                      aria-label="Supprimer l'option"
                    >
                      <Trash2 />
                    </Button>
                  </div>
                ))}
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="self-start"
                onClick={() => append({ value: "" })}
              >
                <Plus />
                Ajouter une option
              </Button>
              {form.formState.errors.options && (
                <p className="text-xs text-destructive">
                  Chaque option doit avoir une valeur.
                </p>
              )}
            </div>
          )}

          <div className="flex items-center justify-between rounded-lg border p-3">
            <div>
              <Label htmlFor="field-required">Champ requis</Label>
              <p className="text-xs text-muted-foreground">
                Affiché comme obligatoire dans les formulaires.
              </p>
            </div>
            <Controller
              control={form.control}
              name="required"
              render={({ field }) => (
                <Switch
                  id="field-required"
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              )}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Annuler
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting && <Loader2 className="animate-spin" />}
              Créer le champ
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
