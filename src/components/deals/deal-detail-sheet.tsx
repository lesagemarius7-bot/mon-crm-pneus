"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Building2, CalendarDays, Loader2, Tag, User } from "lucide-react";

import type { DealDetail } from "@/lib/queries/deals";
import { getDealDetailAction, updateDealOwnerAction } from "@/lib/actions/deals";
import { buildTimeline } from "@/lib/activity-timeline";
import { formatCurrency, formatDate } from "@/lib/labels";
import { ActivityTimeline } from "@/components/activity/activity-timeline";
import { AssigneeSelect } from "@/components/assignee/assignee-select";
import { CustomFieldsEditor } from "@/components/custom-fields/custom-fields-editor";
import { EntityTasksSection } from "@/components/tasks/entity-tasks-section";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

export function DealDetailSheet({
  dealId,
  onOpenChange,
}: {
  dealId: string | null;
  onOpenChange: (open: boolean) => void;
}) {
  const [detail, setDetail] = useState<DealDetail | null>(null);
  const [loadedForId, setLoadedForId] = useState<string | null>(null);

  useEffect(() => {
    if (!dealId) return;
    let cancelled = false;
    getDealDetailAction(dealId).then((result) => {
      if (!cancelled) {
        setDetail(result);
        setLoadedForId(dealId);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [dealId]);

  const loading = dealId !== null && loadedForId !== dealId;

  return (
    <Sheet open={!!dealId} onOpenChange={onOpenChange}>
      <SheetContent className="w-full gap-0 overflow-y-auto sm:max-w-lg">
        {loading || !detail ? (
          <div className="flex h-full items-center justify-center">
            <Loader2 className="size-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            <SheetHeader className="gap-3 border-b pb-4">
              <div>
                <SheetTitle className="text-base">{detail.name}</SheetTitle>
                <SheetDescription className="flex flex-wrap items-center gap-1.5 pt-1">
                  <Badge variant="outline">{detail.stage.name}</Badge>
                  <Badge variant="secondary" className="font-mono">
                    {formatCurrency(detail.value)}
                  </Badge>
                </SheetDescription>
              </div>

              <div className="space-y-2 text-sm">
                <Link
                  href={`/companies?id=${detail.company.id}`}
                  className="flex items-center gap-1.5 text-primary hover:underline"
                >
                  <Building2 className="size-3.5" />
                  {detail.company.name}
                </Link>
                {detail.contact && (
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <User className="size-3.5" />
                    {detail.contact.firstName} {detail.contact.lastName}
                  </div>
                )}
                {detail.proposedBrand && (
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <Tag className="size-3.5" />
                    {detail.proposedBrand}
                    {detail.proposedProducts ? ` — ${detail.proposedProducts}` : ""}
                  </div>
                )}
                {detail.expectedCloseDate && (
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <CalendarDays className="size-3.5" />
                    Clôture estimée : {formatDate(detail.expectedCloseDate)}
                  </div>
                )}
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <User className="size-3.5" />
                  <span>Propriétaire :</span>
                  <AssigneeSelect
                    value={detail.ownerId}
                    className="h-7 w-48"
                    onChange={(value) => {
                      setDetail((prev) => (prev ? { ...prev, ownerId: value } : prev));
                      updateDealOwnerAction(detail.id, value).catch(() => {
                        setDetail((prev) =>
                          prev ? { ...prev, ownerId: detail.ownerId } : prev
                        );
                      });
                    }}
                  />
                </div>
              </div>
            </SheetHeader>

            <div className="space-y-4 p-4">
              <section>
                <h3 className="mb-3 text-sm font-medium">Champs personnalisés</h3>
                <CustomFieldsEditor
                  entity="DEAL"
                  entityId={detail.id}
                  initialValues={detail.customFields}
                />
              </section>

              <Separator />

              <section>
                <h3 className="mb-3 text-sm font-medium">Activités &amp; Suivi</h3>
                <div className="flex flex-col gap-4">
                  <EntityTasksSection dealId={detail.id} />

                  <Separator />

                  <div>
                    <h4 className="mb-2 text-sm font-medium">Historique</h4>
                    <ActivityTimeline
                      dealId={detail.id}
                      initialEntries={buildTimeline(detail.notes, detail.activities)}
                    />
                  </div>
                </div>
              </section>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
