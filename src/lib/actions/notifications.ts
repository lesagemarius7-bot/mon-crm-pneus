"use server";

import { getCurrentUserId } from "@/lib/auth";
import { getPrisma } from "@/lib/prisma";
import { countUnreadNotifications, listNotifications } from "@/lib/queries/notifications";

export async function listMyNotificationsAction() {
  const userId = await getCurrentUserId();
  if (!userId) return { notifications: [], unreadCount: 0 };

  const [notifications, unreadCount] = await Promise.all([
    listNotifications(userId),
    countUnreadNotifications(userId),
  ]);

  return { notifications, unreadCount };
}

export async function markNotificationReadAction(id: string) {
  const userId = await getCurrentUserId();
  if (!userId) return;

  const prisma = getPrisma();
  await prisma.notification.updateMany({
    where: { id, recipientId: userId },
    data: { read: true },
  });
}

export async function markAllNotificationsReadAction() {
  const userId = await getCurrentUserId();
  if (!userId) return;

  const prisma = getPrisma();
  await prisma.notification.updateMany({
    where: { recipientId: userId, read: false },
    data: { read: true },
  });
}
