"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import type { CustomFieldEntity } from "@/generated/prisma/enums";
import type { CustomFieldDefinitionRow } from "@/lib/queries/custom-fields";
import {
  getCustomFieldDefinitionsAction,
  updateCustomFieldValueAction,
} from "@/lib/actions/custom-fields";
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

function toRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function CustomFieldRow({
  definition,
  value,
  onSave,
}: {
  definition: CustomFieldDefinitionRow;
  value: unknown;
  onSave: (value: unknown) => Promise<void>;
}) {
  const [saving, setSaving] = useState(false);

  async function commit(newValue: unknown) {
    setSaving(true);
    try {
      await onSave(newValue);
    } catch (error) {
      toast.error(`Impossible d'enregistrer « ${definition.label} ».`, {
        description: error instanceof Error ? error.message : undefined,
      });
    } finally {
      setSaving(false);
    }
  }

  const label = (
    <Label className="flex items-center gap-1 text-xs text-muted-foreground">
      {definition.label}
      {definition.required && <span className="text-destructive">*</span>}
      {saving && <Loader2 className="size-3 animate-spin" />}
    </Label>
  );

  if (definition.fieldType === "BOOLEAN") {
    return (
      <div className="flex items-center justify-between gap-3">
        {label}
        <Switch
          checked={value === true}
          disabled={saving}
          onCheckedChange={(checked) => commit(checked)}
        />
      </div>
    );
  }

  if (definition.fieldType === "SELECT") {
    const options = Array.isArray(definition.options)
      ? (definition.options as unknown[]).filter((o): o is string => typeof o === "string")
      : [];
    return (
      <div className="flex flex-col gap-1">
        {label}
        <Select
          value={typeof value === "string" ? value : null}
          disabled={saving}
          onValueChange={(next) => commit(next ?? null)}
        >
          <SelectTrigger className="h-8">
            <SelectValue placeholder="Choisir..." />
          </SelectTrigger>
          <SelectContent>
            {options.map((option) => (
              <SelectItem key={option} value={option}>
                {option}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    );
  }

  if (definition.fieldType === "DATE") {
    const draft = typeof value === "string" ? value : "";
    return (
      <div className="flex flex-col gap-1">
        {label}
        <Input
          type="date"
          className="h-8"
          disabled={saving}
          defaultValue={draft}
          onBlur={(e) => {
            if (e.target.value !== draft) commit(e.target.value || null);
          }}
        />
      </div>
    );
  }

  if (definition.fieldType === "NUMBER") {
    const draft = typeof value === "number" ? String(value) : "";
    return (
      <div className="flex flex-col gap-1">
        {label}
        <Input
          type="number"
          className="h-8"
          disabled={saving}
          defaultValue={draft}
          onBlur={(e) => {
            const raw = e.target.value.trim();
            if (raw === draft) return;
            commit(raw === "" ? null : Number(raw));
          }}
        />
      </div>
    );
  }

  // TEXT (and any future fallback type)
  const draft = typeof value === "string" ? value : "";
  return (
    <div className="flex flex-col gap-1">
      {label}
      <Input
        className="h-8"
        disabled={saving}
        defaultValue={draft}
        onBlur={(e) => {
          if (e.target.value !== draft) commit(e.target.value || null);
        }}
      />
    </div>
  );
}

export function CustomFieldsEditor({
  entity,
  entityId,
  initialValues,
}: {
  entity: CustomFieldEntity;
  entityId: string;
  initialValues: unknown;
}) {
  const [definitions, setDefinitions] = useState<CustomFieldDefinitionRow[] | null>(
    null
  );
  const [values, setValues] = useState<Record<string, unknown>>(() =>
    toRecord(initialValues)
  );

  useEffect(() => {
    let cancelled = false;
    getCustomFieldDefinitionsAction(entity).then((defs) => {
      if (!cancelled) setDefinitions(defs.filter((d) => d.isActive));
    });
    return () => {
      cancelled = true;
    };
  }, [entity]);

  if (definitions === null) {
    return <Loader2 className="size-4 animate-spin text-muted-foreground" />;
  }

  if (definitions.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Aucun champ personnalisé configuré pour cette entité.{" "}
        <Link href="/settings" className="text-primary hover:underline">
          Ajoutez-en depuis Paramètres
        </Link>
        .
      </p>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3">
      {definitions.map((definition) => (
        <CustomFieldRow
          key={definition.id}
          definition={definition}
          value={values[definition.key]}
          onSave={async (value) => {
            await updateCustomFieldValueAction(entity, entityId, definition.key, value);
            setValues((prev) => ({ ...prev, [definition.key]: value }));
          }}
        />
      ))}
    </div>
  );
}
