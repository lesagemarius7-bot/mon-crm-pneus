"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";

import type { EmailTemplateRow } from "@/lib/queries/email-templates";
import { deleteEmailTemplateAction } from "@/lib/actions/email-templates";
import { formatDate } from "@/lib/labels";
import { TemplateFormDialog } from "@/components/templates/template-form-dialog";
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

function DeleteTemplateButton({ template }: { template: EmailTemplateRow }) {
  const [deleting, setDeleting] = useState(false);
  const router = useRouter();

  async function handleDelete() {
    setDeleting(true);
    try {
      await deleteEmailTemplateAction(template.id);
      toast.success(`Template « ${template.title} » supprimé.`);
      router.refresh();
    } catch (error) {
      toast.error("Impossible de supprimer ce template.", {
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
          <AlertDialogTitle>Supprimer « {template.title} » ?</AlertDialogTitle>
          <AlertDialogDescription>
            Les étapes de séquence ou automatisations qui l&apos;utilisent perdront leur
            template associé. Cette action est irréversible.
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

export function TemplatesPanel({ templates }: { templates: EmailTemplateRow[] }) {
  return (
    <div className="overflow-hidden rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Titre</TableHead>
            <TableHead>Objet</TableHead>
            <TableHead>Variables</TableHead>
            <TableHead>Mis à jour</TableHead>
            <TableHead className="w-20" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {templates.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                Aucun template pour le moment.
              </TableCell>
            </TableRow>
          ) : (
            templates.map((template) => {
              const variables = Array.isArray(template.variables)
                ? (template.variables as unknown[]).filter((v): v is string => typeof v === "string")
                : [];
              return (
                <TableRow key={template.id}>
                  <TableCell className="font-medium">{template.title}</TableCell>
                  <TableCell className="text-muted-foreground">{template.subject}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {variables.length === 0 ? (
                        <span className="text-muted-foreground">—</span>
                      ) : (
                        variables.map((v) => (
                          <Badge key={v} variant="outline" className="font-mono text-[0.65rem]">
                            {v}
                          </Badge>
                        ))
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatDate(template.updatedAt)}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-0.5">
                      <TemplateFormDialog mode="edit" template={template} />
                      <DeleteTemplateButton template={template} />
                    </div>
                  </TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>
    </div>
  );
}
