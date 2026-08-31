"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";

import type { EmailTemplateOption } from "@/lib/queries/email-templates";
import type { AutomationRow } from "@/lib/queries/automations";
import { deleteAutomationAction, toggleAutomationActiveAction } from "@/lib/actions/automations";
import {
  AUTOMATION_ACTION_TYPE_LABELS,
  AUTOMATION_TRIGGER_LABELS,
  TASK_TYPE_LABELS,
} from "@/lib/labels";
import { AutomationFormDialog } from "@/components/automations/automation-form-dialog";
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

function ActiveToggle({ automation }: { automation: AutomationRow }) {
  const [pending, setPending] = useState(false);
  const router = useRouter();

  async function handleChange(checked: boolean) {
    setPending(true);
    try {
      await toggleAutomationActiveAction(automation.id, checked);
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
      <Switch checked={automation.isActive} onCheckedChange={handleChange} disabled={pending} />
      <Badge variant={automation.isActive ? "default" : "secondary"}>
        {automation.isActive ? "Active" : "Désactivée"}
      </Badge>
    </div>
  );
}

function DeleteAutomationButton({ automation }: { automation: AutomationRow }) {
  const [deleting, setDeleting] = useState(false);
  const router = useRouter();

  async function handleDelete() {
    setDeleting(true);
    try {
      await deleteAutomationAction(automation.id);
      toast.success(`Automatisation « ${automation.name} » supprimée.`);
      router.refresh();
    } catch (error) {
      toast.error("Impossible de supprimer cette automatisation.", {
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
          <AlertDialogTitle>Supprimer « {automation.name} » ?</AlertDialogTitle>
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

export function AutomationsPanel({
  automations,
  templates,
}: {
  automations: AutomationRow[];
  templates: EmailTemplateOption[];
}) {
  return (
    <div className="overflow-hidden rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nom</TableHead>
            <TableHead>Déclencheur</TableHead>
            <TableHead>Action</TableHead>
            <TableHead>Statut</TableHead>
            <TableHead className="w-24" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {automations.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                Aucune automatisation pour le moment.
              </TableCell>
            </TableRow>
          ) : (
            automations.map((automation) => (
              <TableRow key={automation.id}>
                <TableCell className="font-medium">{automation.name}</TableCell>
                <TableCell>
                  <Badge variant="outline">{AUTOMATION_TRIGGER_LABELS[automation.trigger]}</Badge>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {AUTOMATION_ACTION_TYPE_LABELS[automation.actionType]}
                  {automation.actionType === "CREATE_TASK" &&
                    ` — ${automation.taskSubject ?? ""} (J+${automation.delayDays}${
                      automation.taskType ? `, ${TASK_TYPE_LABELS[automation.taskType]}` : ""
                    })`}
                  {automation.actionType === "SEND_EMAIL_TEMPLATE" &&
                    ` — ${automation.template?.title ?? "aucun template"}`}
                </TableCell>
                <TableCell>
                  <ActiveToggle automation={automation} />
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-0.5">
                    <AutomationFormDialog
                      mode="edit"
                      automation={automation}
                      templates={templates}
                    />
                    <DeleteAutomationButton automation={automation} />
                  </div>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
