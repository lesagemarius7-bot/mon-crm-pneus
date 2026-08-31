"use client";

import { useRouter } from "next/navigation";

import type { ProfileOption } from "@/lib/queries/profiles";
import { assigneeLabel } from "@/components/assignee/assignee-badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const ALL_TEAM = "all";

/** Dashboard-wide member filter — lets each commercial see their own
 * pipeline/KPIs while keeping a global "Toute l'équipe" view by default.
 * Drives a `?member=` URL param so the Server Component re-scopes
 * getDashboardData() server-side. */
export function MemberFilter({
  profiles,
  selectedId,
}: {
  profiles: ProfileOption[];
  selectedId: string | null;
}) {
  const router = useRouter();

  return (
    <Select
      value={selectedId ?? ALL_TEAM}
      onValueChange={(value) => {
        const params = new URLSearchParams(window.location.search);
        if (!value || value === ALL_TEAM) {
          params.delete("member");
        } else {
          params.set("member", value);
        }
        const query = params.toString();
        router.push(query ? `/dashboard?${query}` : "/dashboard");
      }}
    >
      <SelectTrigger className="h-8 w-56">
        <SelectValue placeholder="Toute l'équipe" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={ALL_TEAM}>Toute l&apos;équipe</SelectItem>
        {profiles.map((profile) => (
          <SelectItem key={profile.id} value={profile.id}>
            {assigneeLabel(profile)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
