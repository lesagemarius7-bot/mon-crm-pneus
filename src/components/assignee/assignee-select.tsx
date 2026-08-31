"use client";

import { useEffect, useState } from "react";

import type { ProfileOption } from "@/lib/queries/profiles";
import { listProfileOptionsAction } from "@/lib/actions/profiles";
import { assigneeLabel } from "@/components/assignee/assignee-badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const NONE = "none";

/** Self-fetching "Propriétaire / Assigné à" picker — loads the list of
 * assignable members (CRM/Supabase Auth profiles) on mount, so it can be
 * dropped into any form/detail panel without threading the list through
 * every parent. */
export function AssigneeSelect({
  value,
  onChange,
  disabled,
  className,
  placeholder = "Non assigné",
}: {
  value: string | null;
  onChange: (value: string | null) => void;
  disabled?: boolean;
  className?: string;
  placeholder?: string;
}) {
  const [profiles, setProfiles] = useState<ProfileOption[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    listProfileOptionsAction().then((result) => {
      if (!cancelled) setProfiles(result);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const selected = profiles?.find((p) => p.id === value) ?? null;

  return (
    <Select
      value={value ?? NONE}
      disabled={disabled || !profiles}
      onValueChange={(next) => onChange(!next || next === NONE ? null : next)}
    >
      <SelectTrigger className={className}>
        {!profiles ? (
          <span className="text-muted-foreground">Chargement...</span>
        ) : (
          <span className="flex min-w-0 items-center gap-1.5">
            <Avatar size="sm" className="size-5">
              {selected?.avatarUrl && <AvatarImage src={selected.avatarUrl} alt="" />}
              <AvatarFallback className="text-[10px]">
                {selected ? assigneeLabel(selected)[0]?.toUpperCase() : "?"}
              </AvatarFallback>
            </Avatar>
            <SelectValue placeholder={placeholder}>
              {selected ? assigneeLabel(selected) : placeholder}
            </SelectValue>
          </span>
        )}
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={NONE}>Non assigné</SelectItem>
        {(profiles ?? []).map((profile) => (
          <SelectItem key={profile.id} value={profile.id}>
            {assigneeLabel(profile)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
