"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";

import type { CustomFieldDefinitionRow } from "@/lib/queries/custom-fields";
import {
  deleteCustomFieldAction,
  toggleCustomFieldActiveAction,
} from "@/lib/actions/custom-fields";
import { CUSTOM_FIELD_ENTITY_LABELS, CUSTOM_FIELD_TYPE_LABELS } from "@/lib/labels";
import { CustomFieldFormDialog } from "@/components/custom-fields/custom-field-form-dialog";
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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

const ENTITIES = ["COMPANY", "CONTACT", "DEAL", "VEHICLE"] as const;
type Entity = (typeof ENTITIES)[number];

function StatusToggle({ definition }: { definition: CustomFieldDefinitionRow }) {
  const [pending, setPending] = useState(false);
  const router = useRouter();

  async function handleChange(checked: boolean) {
    setPending(true);
    try {
      await toggleCustomFieldActiveAction(definition.id, checked);
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
    <div className="flex items-center gap-2">
      <Switch
        checked={definition.isActive}
        onCheckedChange={handleChange}
        disabled={pending}
        aria-label="Actif"
      />
      <Badge variant={definition.isActive ? "default" : "secondary"}>
        {definition.isActive ? "Actif" : "Masqué"}
      </Badge>
    </div>
  );
}

function DeleteFieldButton({ definition }: { definition: CustomFieldDefinitionRow }) {
  const [deleting, setDeleting] = useState(false);
  const router = useRouter();

  async function handleDelete() {
    setDeleting(true);
    try {
      await deleteCustomFieldAction(definition.id);
      toast.success(`Champ « ${definition.label} » supprimé.`);
      router.refresh();
    } catch (error) {
      toast.error("Impossible de supprimer ce champ.", {
        description: error instanceof Error ? error.message : undefined,
      });
    } finally {
      setDeleting(false);
    }
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger
        render={
          <Button variant="ghost" size="icon-sm" aria-label="Supprimer le champ" />
        }
      >
        <Trash2 className="text-destructive" />
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Supprimer « {definition.label} » ?</AlertDialogTitle>
          <AlertDialogDescription>
            Les valeurs déjà saisies pour ce champ seront définitivement effacées
            sur tous les enregistrements concernés. Cette action est irréversible.
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

export function CustomFieldsPanel({
  definitions,
}: {
  definitions: CustomFieldDefinitionRow[];
}) {
  const [entity, setEntity] = useState<Entity>("COMPANY");
  const scoped = definitions.filter((d) => d.entity === entity);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <Tabs value={entity} onValueChange={(v) => setEntity((v as Entity) ?? "COMPANY")}>
          <TabsList>
            {ENTITIES.map((e) => (
              <TabsTrigger key={e} value={e}>
                {CUSTOM_FIELD_ENTITY_LABELS[e]}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
        <CustomFieldFormDialog defaultEntity={entity} />
      </div>

      <div className="overflow-hidden rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nom du champ</TableHead>
              <TableHead>Clé</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {scoped.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                  Aucun champ personnalisé pour {CUSTOM_FIELD_ENTITY_LABELS[entity]}.
                </TableCell>
              </TableRow>
            ) : (
              scoped.map((definition) => (
                <TableRow key={definition.id}>
                  <TableCell className="font-medium">{definition.label}</TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">
                    {definition.key}
                  </TableCell>
                  <TableCell>{CUSTOM_FIELD_TYPE_LABELS[definition.fieldType]}</TableCell>
                  <TableCell>
                    <StatusToggle definition={definition} />
                  </TableCell>
                  <TableCell>
                    <DeleteFieldButton definition={definition} />
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
