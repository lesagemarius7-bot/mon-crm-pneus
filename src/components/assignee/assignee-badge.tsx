import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export type AssigneeLite = {
  id: string;
  fullName: string | null;
  email: string;
  avatarUrl: string | null;
} | null;

export function assigneeLabel(assignee: AssigneeLite): string {
  return assignee ? (assignee.fullName?.trim() || assignee.email) : "Non assigné";
}

function assigneeInitials(assignee: NonNullable<AssigneeLite>): string {
  const name = assignee.fullName?.trim();
  if (name) {
    const parts = name.split(/\s+/).filter(Boolean);
    return parts
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase())
      .join("");
  }
  return assignee.email[0]?.toUpperCase() ?? "?";
}

/** Small avatar + name/email — the read-only "Propriétaire / Assigné à"
 * display used in table cells, cards and detail sheets. */
export function AssigneeBadge({
  assignee,
  showLabel = true,
  className,
}: {
  assignee: AssigneeLite;
  showLabel?: boolean;
  className?: string;
}) {
  if (!assignee) {
    return (
      <span className="flex items-center gap-1.5 text-muted-foreground">
        <Avatar size="sm">
          <AvatarFallback>?</AvatarFallback>
        </Avatar>
        {showLabel && <span className="truncate text-sm">Non assigné</span>}
      </span>
    );
  }

  return (
    <span className={`flex items-center gap-1.5 ${className ?? ""}`}>
      <Avatar size="sm">
        {assignee.avatarUrl && <AvatarImage src={assignee.avatarUrl} alt="" />}
        <AvatarFallback>{assigneeInitials(assignee)}</AvatarFallback>
      </Avatar>
      {showLabel && (
        <span className="truncate text-sm">{assigneeLabel(assignee)}</span>
      )}
    </span>
  );
}
