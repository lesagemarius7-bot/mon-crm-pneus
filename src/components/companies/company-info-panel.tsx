"use client";

import { useState } from "react";
import { ExternalLink, Loader2 } from "lucide-react";
import { toast } from "sonner";

import type { PipelineStage } from "@/generated/prisma/client";
import type { CompanyDetail } from "@/lib/queries/companies";
import type { CompanyDetailsInput } from "@/lib/actions/companies";
import { COMPANY_STATUS_LABELS, COMPANY_TYPE_LABELS } from "@/lib/labels";
import { CompanyDealsPanel } from "@/components/companies/company-deals-panel";
import { CustomFieldsEditor } from "@/components/custom-fields/custom-fields-editor";
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

function normalizeUrl(value: string): string {
  return /^https?:\/\//i.test(value) ? value : `https://${value}`;
}

function FieldLabel({ label, saving }: { label: string; saving: boolean }) {
  return (
    <Label className="flex items-center gap-1 text-xs text-muted-foreground">
      {label}
      {saving && <Loader2 className="size-3 animate-spin" />}
    </Label>
  );
}

function TextField({
  label,
  value,
  placeholder,
  saving,
  link,
  onCommit,
}: {
  label: string;
  value: string;
  placeholder?: string;
  saving: boolean;
  link?: boolean;
  onCommit: (value: string) => void;
}) {
  return (
    <div className="flex flex-col gap-1">
      <FieldLabel label={label} saving={saving} />
      <div className="flex items-center gap-1">
        <Input
          className="h-8"
          defaultValue={value}
          placeholder={placeholder}
          disabled={saving}
          onBlur={(e) => {
            const next = e.target.value.trim();
            if (next !== value) onCommit(next);
          }}
        />
        {link && value && (
          <a
            href={normalizeUrl(value)}
            target="_blank"
            rel="noreferrer"
            className="shrink-0 rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
            aria-label={`Ouvrir ${label}`}
          >
            <ExternalLink className="size-3.5" />
          </a>
        )}
      </div>
    </div>
  );
}

function NumberField({
  label,
  value,
  placeholder,
  saving,
  onCommit,
}: {
  label: string;
  value: number | null;
  placeholder?: string;
  saving: boolean;
  onCommit: (value: number | null) => void;
}) {
  const draft = value === null ? "" : String(value);
  return (
    <div className="flex flex-col gap-1">
      <FieldLabel label={label} saving={saving} />
      <Input
        type="number"
        min={0}
        className="h-8"
        defaultValue={draft}
        placeholder={placeholder}
        disabled={saving}
        onBlur={(e) => {
          const raw = e.target.value.trim();
          if (raw === draft) return;
          onCommit(raw === "" ? null : Number(raw));
        }}
      />
    </div>
  );
}

/**
 * Left column of the widened Company drawer/fullscreen view — the record's
 * name/links plus every inline-editable core field, each committed on blur
 * via updateCompanyDetailsAction (single-field patches, not the full form).
 */
export function CompanyInfoPanel({
  detail,
  onSave,
  onDealStageChanged,
  onDealCreated,
}: {
  detail: CompanyDetail;
  onSave: (patch: CompanyDetailsInput) => Promise<void>;
  onDealStageChanged: (dealId: string, stage: PipelineStage) => void;
  onDealCreated: () => void;
}) {
  const [savingField, setSavingField] = useState<string | null>(null);

  async function commit(field: string, patch: CompanyDetailsInput) {
    setSavingField(field);
    try {
      await onSave(patch);
    } catch (error) {
      toast.error("Impossible d'enregistrer la modification.", {
        description: error instanceof Error ? error.message : undefined,
      });
    } finally {
      setSavingField(null);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <TextField
        label="Nom de l'entreprise"
        value={detail.name}
        saving={savingField === "name"}
        onCommit={(value) => commit("name", { name: value })}
      />

      <TextField
        label="Site web"
        value={detail.website ?? ""}
        placeholder="www.entreprise.fr"
        link
        saving={savingField === "website"}
        onCommit={(value) => commit("website", { website: value || null })}
      />

      <TextField
        label="LinkedIn"
        value={detail.linkedin ?? ""}
        placeholder="linkedin.com/company/..."
        link
        saving={savingField === "linkedin"}
        onCommit={(value) => commit("linkedin", { linkedin: value || null })}
      />

      <Separator />

      <div className="flex flex-col gap-1">
        <FieldLabel label="Type" saving={savingField === "type"} />
        <Select
          value={detail.type}
          disabled={savingField === "type"}
          onValueChange={(value) =>
            value && commit("type", { type: value as CompanyDetailsInput["type"] })
          }
        >
          <SelectTrigger className="h-8">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(COMPANY_TYPE_LABELS).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-col gap-1">
        <FieldLabel label="Statut" saving={savingField === "status"} />
        <Select
          value={detail.status}
          disabled={savingField === "status"}
          onValueChange={(value) =>
            value && commit("status", { status: value as CompanyDetailsInput["status"] })
          }
        >
          <SelectTrigger className="h-8">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(COMPANY_STATUS_LABELS).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <TextField
        label="Ville"
        value={detail.city ?? ""}
        placeholder="Lyon"
        saving={savingField === "city"}
        onCommit={(value) => commit("city", { city: value || null })}
      />

      <NumberField
        label="Taille de flotte"
        value={detail.fleetSize}
        placeholder="0"
        saving={savingField === "fleetSize"}
        onCommit={(value) => commit("fleetSize", { fleetSize: value })}
      />

      <NumberField
        label="CA estimé (€)"
        value={detail.estimatedRevenue}
        placeholder="0"
        saving={savingField === "estimatedRevenue"}
        onCommit={(value) => commit("estimatedRevenue", { estimatedRevenue: value })}
      />

      <TextField
        label="SIRET"
        value={detail.siret ?? ""}
        placeholder="41234567800012"
        saving={savingField === "siret"}
        onCommit={(value) => commit("siret", { siret: value || null })}
      />

      <Separator />

      <CompanyDealsPanel
        companyId={detail.id}
        contacts={detail.contacts}
        deals={detail.deals}
        onStageChanged={onDealStageChanged}
        onDealCreated={onDealCreated}
      />

      <Separator />

      <div>
        <h4 className="mb-2 text-sm font-medium">Champs personnalisés</h4>
        <CustomFieldsEditor
          entity="COMPANY"
          entityId={detail.id}
          initialValues={detail.customFields}
        />
      </div>
    </div>
  );
}
