import "server-only";

import { getPrisma } from "@/lib/prisma";

export async function listNotifications(recipientId: string, limit = 20) {
  const prisma = getPrisma();
  return prisma.notification.findMany({
    where: { recipientId },
    orderBy: { createdAt: "desc" },
    take: limit,
    include: {
      actor: { select: { id: true, fullName: true, email: true, avatarUrl: true } },
    },
  });
}

export type NotificationRow = Awaited<ReturnType<typeof listNotifications>>[number];

export async function countUnreadNotifications(recipientId: string) {
  const prisma = getPrisma();
  return prisma.notification.count({ where: { recipientId, read: false } });
}
