"use client";

import { useEffect, useState, type ReactElement } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Pencil, Plus } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";

import type { SequenceInput } from "@/lib/actions/sequences";
import { createSequenceAction, updateSequenceAction } from "@/lib/actions/sequences";
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
import { Textarea } from "@/components/ui/textarea";

const sequenceFormSchema = z.object({
  name: z.string().trim().min(1, "Le nom est requis."),
  description: z.string().trim(),
});

type SequenceFormValues = z.infer<typeof sequenceFormSchema>;

export type SequenceFormInitialData = {
  id: string;
  name: string;
  description: string | null;
};

function toFormValues(sequence?: SequenceFormInitialData): SequenceFormValues {
  return {
    name: sequence?.name ?? "",
    description: sequence?.description ?? "",
  };
}

export function SequenceFormDialog({
  mode,
  sequence,
  trigger,
  onSaved,
}: {
  mode: "create" | "edit";
  sequence?: SequenceFormInitialData;
  trigger?: ReactElement;
  onSaved?: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const router = useRouter();

  const form = useForm<SequenceFormValues>({
    resolver: zodResolver(sequenceFormSchema),
    defaultValues: toFormValues(sequence),
  });

  useEffect(() => {
    if (open) form.reset(toFormValues(sequence));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  async function onSubmit(values: SequenceFormValues) {
    setSubmitting(true);
    const input: SequenceInput = { name: values.name, description: values.description || null };
    try {
      const id =
        mode === "create"
          ? await createSequenceAction(input)
          : await updateSequenceAction(sequence!.id, input);

      toast.success(mode === "create" ? "Séquence créée." : "Séquence mise à jour.");
      router.refresh();
      onSaved?.(id);
      setOpen(false);
    } catch (error) {
      toast.error("Impossible d'enregistrer la séquence.", {
        description: error instanceof Error ? error.message : undefined,
      });
    } finally {
      setSubmitting(false);
    }
  }

  const defaultTrigger =
    mode === "create" ? (
      <Button size="sm">
        <Plus />
        Nouvelle séquence
      </Button>
    ) : (
      <Button size="sm" variant="ghost" aria-label="Modifier">
        <Pencil />
      </Button>
    );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={trigger ?? defaultTrigger} />
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{mode === "create" ? "Nouvelle séquence" : "Modifier la séquence"}</DialogTitle>
          <DialogDescription>
            Un enchaînement d&apos;emails et de tâches, planifié sur plusieurs jours.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="sequence-name">Nom</Label>
            <Input
              id="sequence-name"
              placeholder="Relance prospects — génie civil"
              {...form.register("name")}
            />
            {form.formState.errors.name && (
              <p className="text-xs text-destructive">{form.formState.errors.name.message}</p>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="sequence-description">Description</Label>
            <Textarea
              id="sequence-description"
              rows={3}
              placeholder="Objectif de la séquence..."
              {...form.register("description")}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Annuler
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting && <Loader2 className="animate-spin" />}
              {mode === "create" ? "Créer la séquence" : "Enregistrer"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
