"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, Mail, PlayCircle, Trash2, UserMinus } from "lucide-react";
import { toast } from "sonner";

import type { SequenceDetail } from "@/lib/queries/sequences";
import {
  deleteSequenceStepAction,
  getSequenceDetailAction,
  processDueSequenceStepsAction,
  unenrollContactAction,
} from "@/lib/actions/sequences";
import {
  SEQUENCE_ENROLLMENT_STATUS_BADGE,
  SEQUENCE_ENROLLMENT_STATUS_LABELS,
  SEQUENCE_STEP_ACTION_LABELS,
  TASK_TYPE_LABELS,
  formatDateTime,
} from "@/lib/labels";
import { EnrollContactDialog } from "@/components/sequences/enroll-contact-dialog";
import { SequenceStepFormDialog } from "@/components/sequences/sequence-step-form-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

export function SequenceDetailSheet({
  sequenceId,
  onOpenChange,
}: {
  sequenceId: string | null;
  onOpenChange: (open: boolean) => void;
}) {
  const [detail, setDetail] = useState<SequenceDetail | null>(null);
  const [loadedForId, setLoadedForId] = useState<string | null>(null);
  const [running, setRunning] = useState(false);

  const refetch = useCallback(() => {
    if (!sequenceId) return;
    getSequenceDetailAction(sequenceId).then((result) => {
      setDetail(result);
      setLoadedForId(sequenceId);
    });
  }, [sequenceId]);

  useEffect(() => {
    if (!sequenceId) return;
    let cancelled = false;
    getSequenceDetailAction(sequenceId).then((result) => {
      if (!cancelled) {
        setDetail(result);
        setLoadedForId(sequenceId);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [sequenceId]);

  const loading = sequenceId !== null && loadedForId !== sequenceId;

  async function handleDeleteStep(stepId: string) {
    try {
      await deleteSequenceStepAction(stepId);
      toast.success("Étape supprimée.");
      refetch();
    } catch (error) {
      toast.error("Impossible de supprimer cette étape.", {
        description: error instanceof Error ? error.message : undefined,
      });
    }
  }

  async function handleUnenroll(enrollmentId: string) {
    try {
      await unenrollContactAction(enrollmentId);
      toast.success("Contact désinscrit.");
      refetch();
    } catch (error) {
      toast.error("Impossible de désinscrire ce contact.", {
        description: error instanceof Error ? error.message : undefined,
      });
    }
  }

  async function handleRunDue() {
    setRunning(true);
    try {
      const { processed } = await processDueSequenceStepsAction();
      toast.success(
        processed > 0
          ? `${processed} étape${processed > 1 ? "s" : ""} exécutée${processed > 1 ? "s" : ""}.`
          : "Aucune étape due pour le moment."
      );
      refetch();
    } catch (error) {
      toast.error("Impossible d'exécuter les étapes dues.", {
        description: error instanceof Error ? error.message : undefined,
      });
    } finally {
      setRunning(false);
    }
  }

  return (
    <Sheet open={!!sequenceId} onOpenChange={onOpenChange}>
      <SheetContent className="w-full gap-0 overflow-y-auto sm:max-w-xl">
        {loading || !detail ? (
          <div className="flex h-full items-center justify-center">
            <Loader2 className="size-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            <SheetHeader className="gap-2 border-b pb-4">
              <SheetTitle>{detail.name}</SheetTitle>
              {detail.description && (
                <SheetDescription>{detail.description}</SheetDescription>
              )}
              <Button
                size="sm"
                variant="outline"
                className="mt-2 w-fit"
                onClick={handleRunDue}
                disabled={running}
              >
                {running ? <Loader2 className="animate-spin" /> : <PlayCircle />}
                Exécuter les étapes dues
              </Button>
            </SheetHeader>

            <div className="flex flex-col gap-6 p-4">
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <h4 className="text-sm font-medium">Étapes ({detail.steps.length})</h4>
                  <SequenceStepFormDialog
                    mode="create"
                    sequenceId={detail.id}
                    nextOrder={(detail.steps.at(-1)?.order ?? 0) + 1}
                    onSaved={refetch}
                  />
                </div>
                {detail.steps.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Aucune étape configurée.</p>
                ) : (
                  <ul className="flex flex-col gap-2">
                    {detail.steps.map((step, index) => (
                      <li key={step.id} className="rounded-lg border p-3 text-sm">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="font-medium">
                              Étape {index + 1} · {SEQUENCE_STEP_ACTION_LABELS[step.action]}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {step.delayDays === 0
                                ? "Immédiat"
                                : `Après ${step.delayDays} jour${step.delayDays > 1 ? "s" : ""}`}
                            </p>
                            {step.action === "SEND_EMAIL" && (
                              <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                                <Mail className="size-3.5" />
                                {step.emailSource === "CUSTOM"
                                  ? (step.emailSubject
                                      ? `Email personnalisé — « ${step.emailSubject} »`
                                      : "Email personnalisé (sans objet)")
                                  : (step.template?.title ?? "Aucun template sélectionné")}
                              </p>
                            )}
                            {step.action === "CREATE_TASK" && (
                              <p className="mt-1 text-xs text-muted-foreground">
                                {step.taskSubject ?? "—"}
                                {step.taskType && ` · ${TASK_TYPE_LABELS[step.taskType]}`}
                              </p>
                            )}
                          </div>
                          <div className="flex shrink-0 items-center gap-0.5">
                            <SequenceStepFormDialog
                              mode="edit"
                              sequenceId={detail.id}
                              step={step}
                              onSaved={refetch}
                            />
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              aria-label="Supprimer l'étape"
                              onClick={() => handleDeleteStep(step.id)}
                            >
                              <Trash2 className="text-destructive" />
                            </Button>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <Separator />

              <div>
                <div className="mb-2 flex items-center justify-between">
                  <h4 className="text-sm font-medium">
                    Contacts inscrits ({detail.enrollments.length})
                  </h4>
                  <EnrollContactDialog
                    sequenceId={detail.id}
                    alreadyEnrolledIds={detail.enrollments.map((e) => e.contactId)}
                    onEnrolled={refetch}
                  />
                </div>
                {detail.enrollments.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Aucun contact inscrit.</p>
                ) : (
                  <ul className="flex flex-col gap-2">
                    {detail.enrollments.map((enrollment) => (
                      <li
                        key={enrollment.id}
                        className="flex items-center justify-between gap-2 rounded-lg border p-2.5 text-sm"
                      >
                        <div className="min-w-0">
                          <p className="truncate font-medium">
                            {enrollment.contact.firstName} {enrollment.contact.lastName}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {enrollment.contact.company?.name ?? "—"}
                            {enrollment.status === "ACTIVE" && enrollment.nextStepDueAt
                              ? ` · Prochaine étape : ${formatDateTime(enrollment.nextStepDueAt)}`
                              : ""}
                          </p>
                        </div>
                        <div className="flex shrink-0 items-center gap-1.5">
                          <Badge variant={SEQUENCE_ENROLLMENT_STATUS_BADGE[enrollment.status]}>
                            {SEQUENCE_ENROLLMENT_STATUS_LABELS[enrollment.status]}
                          </Badge>
                          {enrollment.status === "ACTIVE" && (
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              aria-label="Désinscrire"
                              onClick={() => handleUnenroll(enrollment.id)}
                            >
                              <UserMinus />
                            </Button>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
