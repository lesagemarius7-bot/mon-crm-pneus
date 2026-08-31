import type { ActivityType } from "@/generated/prisma/enums";

export type TimelineEntry =
  | {
      kind: "note";
      id: string;
      content: string;
      createdAt: Date;
      authorName: string | null;
    }
  | {
      kind: "activity";
      id: string;
      activityType: ActivityType;
      subject: string;
      description: string | null;
      createdAt: Date;
      ownerName: string | null;
      ownerAvatarUrl: string | null;
    };

type NoteLike = {
  id: string;
  content: string;
  createdAt: Date;
  author?: { fullName: string | null; email: string } | null;
};

type ActivityLike = {
  id: string;
  type: ActivityType;
  subject: string;
  description: string | null;
  createdAt: Date;
  owner?: { fullName: string | null; email: string; avatarUrl: string | null } | null;
};

/** Marks activities auto-logged by moveDealStageAction so the timeline can
 * give pipeline-stage transitions their own icon instead of the generic
 * "AUTRE" one. */
export const STAGE_CHANGE_PREFIX = "Étape changée :";

export function buildTimeline(
  notes: NoteLike[],
  activities: ActivityLike[]
): TimelineEntry[] {
  const noteEntries: TimelineEntry[] = notes.map((note) => ({
    kind: "note",
    id: note.id,
    content: note.content,
    createdAt: note.createdAt,
    authorName: note.author?.fullName ?? note.author?.email ?? null,
  }));

  const activityEntries: TimelineEntry[] = activities.map((activity) => ({
    kind: "activity",
    id: activity.id,
    activityType: activity.type,
    subject: activity.subject,
    description: activity.description,
    createdAt: activity.createdAt,
    ownerName: activity.owner?.fullName ?? activity.owner?.email ?? null,
    ownerAvatarUrl: activity.owner?.avatarUrl ?? null,
  }));

  return [...noteEntries, ...activityEntries].sort(
    (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
  );
}
