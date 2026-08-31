import "server-only";

import type { NotificationType } from "@/generated/prisma/enums";
import { extractMentions, stripMentionSyntax } from "@/lib/mentions";
import { getPrisma } from "@/lib/prisma";

/**
 * Scans note/activity text for @[Name](profileId) mentions and creates a
 * MENTION notification for each distinct, real, non-self profile mentioned.
 * Called from createNoteAction/createActivityAction right after the
 * record is created.
 */
export async function notifyMentions({
  text,
  actorId,
  link,
}: {
  text: string;
  actorId: string | null;
  link: string;
}): Promise<void> {
  const mentions = extractMentions(text);
  if (mentions.length === 0) return;

  const targetIds = [...new Set(mentions.map((m) => m.profileId))].filter((id) => id !== actorId);
  if (targetIds.length === 0) return;

  const prisma = getPrisma();
  const [validProfiles, actor] = await Promise.all([
    prisma.profile.findMany({ where: { id: { in: targetIds } }, select: { id: true } }),
    actorId
      ? prisma.profile.findUnique({ where: { id: actorId }, select: { fullName: true, email: true } })
      : null,
  ]);
  const validIds = new Set(validProfiles.map((p) => p.id));
  const recipients = targetIds.filter((id) => validIds.has(id));
  if (recipients.length === 0) return;

  const actorName = actor ? (actor.fullName ?? actor.email) : "Quelqu'un";
  const snippet = stripMentionSyntax(text).slice(0, 160);

  await prisma.notification.createMany({
    data: recipients.map((recipientId) => ({
      recipientId,
      actorId: actorId ?? undefined,
      type: "MENTION" as NotificationType,
      title: `${actorName} vous a mentionné`,
      body: snippet,
      link,
    })),
  });
}

/**
 * Notifies a member they've been made owner/assignee of a record — called
 * whenever a Task/Deal/Company/Contact's owner/assignedTo changes to
 * someone other than the person making the change. Silently no-ops when
 * unassigning, self-assigning, or when the recipient didn't actually change.
 * `entityLabel` fills the title's "... vous a assigné {entityLabel}" —
 * e.g. `la tâche « Relancer client X »`.
 */
export async function notifyAssignment({
  recipientId,
  actorId,
  type,
  entityLabel,
  link,
}: {
  recipientId: string | null | undefined;
  actorId: string | null;
  type: NotificationType;
  entityLabel: string;
  link: string;
}): Promise<void> {
  if (!recipientId || recipientId === actorId) return;
  const prisma = getPrisma();
  const actor = actorId
    ? await prisma.profile.findUnique({ where: { id: actorId }, select: { fullName: true, email: true } })
    : null;
  const actorName = actor ? (actor.fullName ?? actor.email) : "Quelqu'un";

  await prisma.notification.create({
    data: {
      recipientId,
      actorId: actorId ?? undefined,
      type,
      title: `${actorName} vous a assigné ${entityLabel}`,
      link,
    },
  });
}
