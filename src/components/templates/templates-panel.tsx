"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";

import type { EmailTemplateRow } from "@/lib/queries/email-templates";
import type { ProfileOption } from "@/lib/queries/profiles";
import { deleteEmailTemplateAction } from "@/lib/actions/email-templates";
import { formatDate } from "@/lib/labels";
import { AssigneeBadge, assigneeLabel } from "@/components/assignee/assignee-badge";
import { MyItemsToggle } from "@/components/assignee/my-items-toggle";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const ALL_MEMBERS = "all";

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

export function TemplatesPanel({
  templates,
  profiles,
  currentUserId,
}: {
  templates: EmailTemplateRow[];
  profiles: ProfileOption[];
  currentUserId: string | null;
}) {
  const [mineOnly, setMineOnly] = useState(false);
  const [memberFilter, setMemberFilter] = useState(ALL_MEMBERS);

  const filteredTemplates = useMemo(() => {
    if (mineOnly) {
      return currentUserId
        ? templates.filter((t) => t.createdBy?.id === currentUserId)
        : templates;
    }
    if (memberFilter !== ALL_MEMBERS) {
      return templates.filter((t) => t.createdBy?.id === memberFilter);
    }
    return templates;
  }, [templates, mineOnly, memberFilter, currentUserId]);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <MyItemsToggle mineOnly={mineOnly} onChange={setMineOnly} />
        {!mineOnly && (
          <Select
            value={memberFilter}
            onValueChange={(value) => setMemberFilter(value ?? ALL_MEMBERS)}
          >
            <SelectTrigger className="h-8 w-56">
              <SelectValue placeholder="Tous les membres" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_MEMBERS}>Tous les membres</SelectItem>
              {profiles.map((profile) => (
                <SelectItem key={profile.id} value={profile.id}>
                  {assigneeLabel(profile)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        <span className="text-sm text-muted-foreground">
          {filteredTemplates.length} / {templates.length}
        </span>
      </div>

      <div className="overflow-hidden rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Titre</TableHead>
              <TableHead>Objet</TableHead>
              <TableHead>Variables</TableHead>
              <TableHead>Auteur</TableHead>
              <TableHead>Mis à jour</TableHead>
              <TableHead className="w-20" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredTemplates.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                  Aucun template ne correspond à ce filtre.
                </TableCell>
              </TableRow>
            ) : (
              filteredTemplates.map((template) => {
                const variables = Array.isArray(template.variables)
                  ? (template.variables as unknown[]).filter(
                      (v): v is string => typeof v === "string"
                    )
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
                    <TableCell>
                      <AssigneeBadge assignee={template.createdBy} />
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
    </div>
  );
}
