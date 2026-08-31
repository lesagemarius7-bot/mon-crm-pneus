"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AtSign, Bell, Briefcase, Building2, CheckSquare, User } from "lucide-react";

import type { NotificationRow } from "@/lib/queries/notifications";
import {
  listMyNotificationsAction,
  markAllNotificationsReadAction,
  markNotificationReadAction,
} from "@/lib/actions/notifications";
import { formatDateTime } from "@/lib/labels";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

const POLL_INTERVAL_MS = 30_000;

function iconFor(type: NotificationRow["type"]) {
  switch (type) {
    case "MENTION":
      return AtSign;
    case "TASK_ASSIGNED":
      return CheckSquare;
    case "DEAL_ASSIGNED":
      return Briefcase;
    case "COMPANY_ASSIGNED":
      return Building2;
    case "CONTACT_ASSIGNED":
      return User;
    default:
      return Bell;
  }
}

/** Header notification bell — mentions, task/deal/company/contact
 * assignments. Self-fetching (poll every 30s + refetch on open); clicking
 * a notification marks it read and navigates to its `link`. */
export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationRow[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const router = useRouter();

  const refresh = useCallback(() => {
    listMyNotificationsAction().then((result) => {
      setNotifications(result.notifications);
      setUnreadCount(result.unreadCount);
    });
  }, []);

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [refresh]);

  function handleSelect(notification: NotificationRow) {
    setOpen(false);
    if (!notification.read) {
      setNotifications((prev) =>
        prev.map((n) => (n.id === notification.id ? { ...n, read: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
      markNotificationReadAction(notification.id).catch(() => {});
    }
    router.push(notification.link);
  }

  async function handleMarkAllRead() {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnreadCount(0);
    await markAllNotificationsReadAction();
  }

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) refresh();
      }}
    >
      <PopoverTrigger
        render={<Button variant="ghost" size="icon" className="relative" aria-label="Notifications" />}
      >
        <Bell className="size-4" />
        {unreadCount > 0 && (
          <span className="absolute top-0.5 right-0.5 flex size-4 items-center justify-center rounded-full bg-destructive text-[10px] font-medium text-destructive-foreground">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between border-b px-3 py-2">
          <span className="text-sm font-medium">Notifications</span>
          {unreadCount > 0 && (
            <Button variant="ghost" size="xs" onClick={handleMarkAllRead}>
              Tout marquer comme lu
            </Button>
          )}
        </div>
        <div className="max-h-96 overflow-y-auto">
          {notifications.length === 0 ? (
            <p className="p-4 text-center text-sm text-muted-foreground">
              Aucune notification pour le moment.
            </p>
          ) : (
            notifications.map((notification) => {
              const Icon = iconFor(notification.type);
              return (
                <button
                  key={notification.id}
                  type="button"
                  onClick={() => handleSelect(notification)}
                  className={cn(
                    "flex w-full items-start gap-2.5 border-b px-3 py-2.5 text-left text-sm last:border-b-0 hover:bg-muted",
                    !notification.read && "bg-primary/5"
                  )}
                >
                  <div className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-muted">
                    <Icon className="size-3.5 text-muted-foreground" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{notification.title}</p>
                    {notification.body && (
                      <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                        {notification.body}
                      </p>
                    )}
                    <p className="mt-1 text-xs text-muted-foreground">
                      {formatDateTime(notification.createdAt)}
                    </p>
                  </div>
                  {!notification.read && (
                    <span className="mt-1.5 size-2 shrink-0 rounded-full bg-primary" />
                  )}
                </button>
              );
            })
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
