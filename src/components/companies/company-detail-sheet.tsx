"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Building2,
  Loader2,
  Mail,
  Maximize2,
  Minimize2,
  MessageSquarePlus,
  Plus,
  Truck,
} from "lucide-react";
import { toast } from "sonner";

import type { CompanyDetail } from "@/lib/queries/companies";
import { getCompanyDetailAction, updateCompanyDetailsAction } from "@/lib/actions/companies";
import { deleteVehiclesAction } from "@/lib/actions/vehicles";
import { buildTimeline } from "@/lib/activity-timeline";
import type { TemplateContext } from "@/lib/template-render";
import { useRealtimeSync, type RealtimeTable } from "@/hooks/use-realtime-sync";
import {
  COMPANY_STATUS_BADGE,
  COMPANY_STATUS_LABELS,
  COMPANY_TYPE_LABELS,
  TIRE_TYPE_LABELS,
  formatCurrency,
} from "@/lib/labels";
import { ActivityTimeline } from "@/components/activity/activity-timeline";
import { CallEmailHistory } from "@/components/activity/call-email-history";
import { QuickLogDialog } from "@/components/activity/quick-log-dialog";
import { BulkActionsBar } from "@/components/bulk-actions-bar";
import { CompanyContactsPanel } from "@/components/companies/company-contacts-panel";
import { CompanyInfoPanel } from "@/components/companies/company-info-panel";
import { EnrollInSequenceDialog } from "@/components/companies/enroll-in-sequence-dialog";
import { SendEmailDialog } from "@/components/email/send-email-dialog";
import { EntityTasksSection } from "@/components/tasks/entity-tasks-section";
import { TaskFormDialog } from "@/components/tasks/task-form-dialog";
import { VehicleFormDialog } from "@/components/vehicles/vehicle-form-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

// Module-level so useRealtimeSync always receives a stable array reference.
const REALTIME_TABLES: RealtimeTable[] = [
  "companies",
  "contacts",
  "deals",
  "tasks",
  "activities",
];

export function CompanyDetailSheet({
  companyId,
  onOpenChange,
}: {
  companyId: string | null;
  onOpenChange: (open: boolean) => void;
}) {
  const [detail, setDetail] = useState<CompanyDetail | null>(null);
  // Tracks which company the current `detail` was fetched for, so we can
  // derive the loading state instead of toggling it with a synchronous
  // setState at the top of the effect body.
  const [loadedForId, setLoadedForId] = useState<string | null>(null);
  const [selectedVehicleIds, setSelectedVehicleIds] = useState<Set<string>>(
    new Set()
  );
  const [fullscreen, setFullscreen] = useState(false);
  // Bumped after any header quick action (task/note/email) so the
  // currently-mounted tab content (which self-fetches on mount) re-fetches
  // even if the user never switches tabs away and back.
  const [refreshToken, setRefreshToken] = useState(0);

  const fetchDetail = useCallback(async (id: string) => {
    const result = await getCompanyDetailAction(id);
    setDetail(result);
    setLoadedForId(id);
  }, []);

  useEffect(() => {
    if (!companyId) return;
    let cancelled = false;
    getCompanyDetailAction(companyId).then((result) => {
      if (!cancelled) {
        setDetail(result);
        setLoadedForId(companyId);
        setSelectedVehicleIds(new Set());
        setFullscreen(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [companyId]);

  const loading = companyId !== null && loadedForId !== companyId;

  const refetch = useCallback(() => {
    if (companyId) fetchDetail(companyId);
  }, [companyId, fetchDetail]);

  async function bumpAndRefetch() {
    await refetch();
    setRefreshToken((n) => n + 1);
  }

  // Keeps the open company's data (and its currently-mounted tab content,
  // via refreshToken) live when another user changes something related to
  // it — the underlying company itself, or one of its contacts/deals/
  // tasks/activities.
  useRealtimeSync(REALTIME_TABLES, bumpAndRefetch, { enabled: companyId !== null });

  async function saveCompanyField(patch: Parameters<typeof updateCompanyDetailsAction>[1]) {
    if (!detail) return;
    await updateCompanyDetailsAction(detail.id, patch);
    setDetail((prev) => (prev ? { ...prev, ...patch } : prev));
  }

  function applyDealStagePatch(dealId: string, stage: CompanyDetail["deals"][number]["stage"]) {
    setDetail((prev) =>
      prev
        ? {
            ...prev,
            deals: prev.deals.map((deal) => (deal.id === dealId ? { ...deal, stage } : deal)),
          }
        : prev
    );
  }

  async function handleBulkDeleteVehicles() {
    const ids = Array.from(selectedVehicleIds);
    try {
      const count = await deleteVehiclesAction(ids);
      toast.success(`${count} véhicule${count > 1 ? "s" : ""} supprimé${count > 1 ? "s" : ""}.`);
      setSelectedVehicleIds(new Set());
      refetch();
    } catch (error) {
      toast.error("Impossible de supprimer ces véhicules.", {
        description: error instanceof Error ? error.message : undefined,
      });
    }
  }

  const primaryContact = detail?.contacts.find((c) => c.email) ?? detail?.contacts[0] ?? null;

  const templateContext: TemplateContext | undefined = detail
    ? {
        company: { name: detail.name, city: detail.city, type: COMPANY_TYPE_LABELS[detail.type] },
        contact: primaryContact
          ? {
              firstName: primaryContact.firstName,
              lastName: primaryContact.lastName,
              email: primaryContact.email,
              phone: primaryContact.phone,
            }
          : null,
        deal: detail.deals[0]
          ? { name: detail.deals[0].name, amount: detail.deals[0].value, stage: detail.deals[0].stage.name }
          : null,
      }
    : undefined;

  return (
    <Sheet
      open={!!companyId}
      onOpenChange={(open) => {
        if (!open) setFullscreen(false);
        onOpenChange(open);
      }}
    >
      <SheetContent
        className="flex h-full flex-col gap-0 overflow-hidden p-0"
        style={
          fullscreen
            ? { width: "100vw", maxWidth: "100vw" }
            : { width: "min(96vw, 1180px)", maxWidth: "96vw" }
        }
      >
        {loading || !detail ? (
          <div className="flex h-full items-center justify-center">
            <Loader2 className="size-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            <div className="flex shrink-0 flex-col gap-3 border-b p-4 pr-14">
              <div className="flex items-start gap-3">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted">
                  <Building2 className="size-5 text-muted-foreground" />
                </div>
                <div className="min-w-0 flex-1">
                  <h2 className="truncate text-base font-medium">{detail.name}</h2>
                  <div className="flex flex-wrap items-center gap-1.5 pt-1">
                    <Badge variant={COMPANY_STATUS_BADGE[detail.status]}>
                      {COMPANY_STATUS_LABELS[detail.status]}
                    </Badge>
                    <Badge variant="outline">{COMPANY_TYPE_LABELS[detail.type]}</Badge>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => setFullscreen((v) => !v)}
                  aria-label={fullscreen ? "Réduire" : "Agrandir en plein écran"}
                >
                  {fullscreen ? <Minimize2 /> : <Maximize2 />}
                </Button>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <SendEmailDialog
                  companyId={detail.id}
                  contactId={primaryContact?.id}
                  defaultTo={primaryContact?.email}
                  templateContext={templateContext}
                  onSent={bumpAndRefetch}
                  trigger={
                    <Button variant="outline" size="sm">
                      <Mail /> Envoyer un email
                    </Button>
                  }
                />
                <TaskFormDialog
                  companyId={detail.id}
                  onCreated={bumpAndRefetch}
                  trigger={
                    <Button variant="outline" size="sm">
                      <Plus /> Tâche
                    </Button>
                  }
                />
                <QuickLogDialog
                  companyId={detail.id}
                  onSaved={bumpAndRefetch}
                  trigger={
                    <Button variant="outline" size="sm">
                      <MessageSquarePlus /> Note / Appel
                    </Button>
                  }
                />
                <EnrollInSequenceDialog
                  contacts={detail.contacts}
                  defaultContactId={primaryContact?.id}
                  onEnrolled={bumpAndRefetch}
                />
              </div>
            </div>

            <div className="grid flex-1 grid-cols-1 overflow-hidden lg:grid-cols-[280px_minmax(0,1fr)_300px]">
              <aside className="overflow-y-auto border-b p-4 lg:border-r lg:border-b-0">
                <CompanyInfoPanel
                  detail={detail}
                  onSave={saveCompanyField}
                  onDealStageChanged={applyDealStagePatch}
                  onDealCreated={refetch}
                />
              </aside>

              <div className="flex min-w-0 flex-col overflow-hidden">
                <Tabs defaultValue="activity" className="flex h-full flex-col gap-0">
                  <TabsList className="w-full shrink-0 justify-start rounded-none border-b bg-transparent px-4">
                    <TabsTrigger value="activity">Activités &amp; Notes</TabsTrigger>
                    <TabsTrigger value="tasks">Tâches à venir</TabsTrigger>
                    <TabsTrigger value="history">Mails &amp; Appels</TabsTrigger>
                    <TabsTrigger value="vehicles">
                      Flotte ({detail.vehicles.length})
                    </TabsTrigger>
                    <TabsTrigger value="deals">Deals ({detail.deals.length})</TabsTrigger>
                  </TabsList>

                  <div className="flex-1 overflow-y-auto">
                    <TabsContent value="activity" className="p-4">
                      <ActivityTimeline
                        key={`timeline-${refreshToken}`}
                        companyId={detail.id}
                        initialEntries={buildTimeline(detail.notes, detail.activities)}
                      />
                    </TabsContent>

                    <TabsContent value="tasks" className="p-4">
                      <EntityTasksSection
                        key={`tasks-${refreshToken}`}
                        companyId={detail.id}
                      />
                    </TabsContent>

                    <TabsContent value="history" className="p-4">
                      <CallEmailHistory
                        key={`history-${refreshToken}`}
                        companyId={detail.id}
                      />
                    </TabsContent>

                    <TabsContent value="vehicles" className="space-y-3 p-4">
                      <div className="flex items-center justify-between">
                        {detail.vehicles.length > 0 ? (
                          <div className="flex items-center gap-2">
                            <Checkbox
                              checked={selectedVehicleIds.size === detail.vehicles.length}
                              indeterminate={
                                selectedVehicleIds.size > 0 &&
                                selectedVehicleIds.size < detail.vehicles.length
                              }
                              onCheckedChange={(checked) =>
                                setSelectedVehicleIds(
                                  checked
                                    ? new Set(detail.vehicles.map((v) => v.id))
                                    : new Set()
                                )
                              }
                              id="select-all-vehicles"
                            />
                            <Label
                              htmlFor="select-all-vehicles"
                              className="text-xs text-muted-foreground"
                            >
                              Tout sélectionner
                            </Label>
                          </div>
                        ) : (
                          <span />
                        )}
                        <VehicleFormDialog
                          mode="create"
                          companyId={detail.id}
                          onSaved={refetch}
                        />
                      </div>
                      {detail.vehicles.length === 0 ? (
                        <p className="text-sm text-muted-foreground">
                          Aucun véhicule/équipement associé.
                        </p>
                      ) : (
                        <ul className="space-y-3">
                          {detail.vehicles.map((vehicle) => (
                            <li
                              key={vehicle.id}
                              className="flex gap-2 rounded-lg border p-3 text-sm"
                            >
                              <Checkbox
                                className="mt-0.5"
                                checked={selectedVehicleIds.has(vehicle.id)}
                                onCheckedChange={(checked) =>
                                  setSelectedVehicleIds((prev) => {
                                    const next = new Set(prev);
                                    if (checked) next.add(vehicle.id);
                                    else next.delete(vehicle.id);
                                    return next;
                                  })
                                }
                                aria-label="Sélectionner le véhicule"
                              />
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center justify-between gap-2">
                                  <div className="flex items-center gap-1.5 font-medium">
                                    <Truck className="size-3.5 text-muted-foreground" />
                                    {vehicle.label}
                                  </div>
                                  <VehicleFormDialog
                                    mode="edit"
                                    companyId={detail.id}
                                    vehicle={vehicle}
                                    onSaved={refetch}
                                  />
                                </div>
                                <div className="mt-1.5 grid grid-cols-2 gap-1 text-muted-foreground">
                                  <span>{TIRE_TYPE_LABELS[vehicle.tireType]}</span>
                                  <span>{vehicle.tireDimension}</span>
                                  <span>Marque actuelle : {vehicle.currentBrand ?? "—"}</span>
                                  <span>Marque préférée : {vehicle.preferredBrand ?? "—"}</span>
                                </div>
                              </div>
                            </li>
                          ))}
                        </ul>
                      )}

                      <BulkActionsBar
                        selectedCount={selectedVehicleIds.size}
                        itemLabel="véhicule"
                        itemLabelPlural="véhicules"
                        position="absolute"
                        onClear={() => setSelectedVehicleIds(new Set())}
                        onConfirmDelete={handleBulkDeleteVehicles}
                      />
                    </TabsContent>

                    <TabsContent value="deals" className="p-4">
                      {detail.deals.length === 0 ? (
                        <p className="text-sm text-muted-foreground">Aucun deal en cours.</p>
                      ) : (
                        <ul className="space-y-3">
                          {detail.deals.map((deal) => (
                            <li key={deal.id} className="rounded-lg border p-3 text-sm">
                              <div className="flex items-center justify-between">
                                <span className="font-medium">{deal.name}</span>
                                <Badge variant="outline">{deal.stage.name}</Badge>
                              </div>
                              <div className="mt-1 text-muted-foreground">
                                {formatCurrency(deal.value)}
                              </div>
                            </li>
                          ))}
                        </ul>
                      )}
                    </TabsContent>
                  </div>
                </Tabs>
              </div>

              <aside className="overflow-y-auto border-t p-4 lg:border-t-0 lg:border-l">
                <CompanyContactsPanel detail={detail} onRefetch={refetch} />
              </aside>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
