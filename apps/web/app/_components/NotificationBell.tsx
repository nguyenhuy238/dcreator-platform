"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Bell } from "@phosphor-icons/react";
import { ActionToast } from "@/app/components/dcreator/ui/base";
import { formatNotificationDateTime, normalizeNotificationText } from "@/lib/notifications/notification-copy";

type NotificationItem = {
  id: string;
  title: string;
  content: string;
  isRead: boolean;
  createdAt: string;
};

type NotificationApiResponse = {
  success: boolean;
  data?: {
    items: NotificationItem[];
    unreadCount: number;
  };
};

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [badgeCount, setBadgeCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [realtimeToast, setRealtimeToast] = useState("");
  const knownNotificationIdsRef = useRef<Set<string>>(new Set());
  const hydratedRef = useRef(false);
  const unreadCountRef = useRef(0);

  const topItems = useMemo(() => items.slice(0, 6), [items]);

  const fetchNotifications = useCallback(async (options?: { resetBadge?: boolean; showRealtimeToast?: boolean }) => {
    const response = await fetch("/api/me/notifications?limit=20", {
      method: "GET",
      credentials: "include",
      cache: "no-store"
    });
    if (!response.ok) {
      setLoading(false);
      return;
    }
    const payload = (await response.json()) as NotificationApiResponse;
    const nextUnreadCount = payload.data?.unreadCount ?? 0;
    const nextItems = payload.data?.items ?? [];
    const nextNewUnread = nextItems.find((item) => !item.isRead && !knownNotificationIdsRef.current.has(item.id));
    const shouldShowUnreadToast = Boolean(
      options?.showRealtimeToast &&
        hydratedRef.current &&
        (nextUnreadCount > unreadCountRef.current || nextNewUnread)
    );
    const toastItem = nextNewUnread ?? nextItems.find((item) => !item.isRead);
    if (shouldShowUnreadToast && toastItem) {
      setRealtimeToast(`${normalizeNotificationText(toastItem.title)}: ${normalizeNotificationText(toastItem.content)}`);
      setTimeout(() => setRealtimeToast(""), 3200);
    }
    knownNotificationIdsRef.current = new Set(nextItems.map((item) => item.id));
    hydratedRef.current = true;
    unreadCountRef.current = nextUnreadCount;
    setItems(nextItems);
    setUnreadCount(nextUnreadCount);
    setBadgeCount(options?.resetBadge ? 0 : nextUnreadCount);
    setLoading(false);
  }, []);

  async function onRead(id: string) {
    const response = await fetch(`/api/me/notifications/${id}/read`, {
      method: "POST",
      credentials: "include"
    });
    if (!response.ok) return;
    setItems((prev) => prev.map((item) => (item.id === id ? { ...item, isRead: true } : item)));
    setUnreadCount((prev) => Math.max(0, prev - 1));
    unreadCountRef.current = Math.max(0, unreadCountRef.current - 1);
    setBadgeCount((prev) => Math.max(0, prev - 1));
  }

  async function onReadAll() {
    const response = await fetch("/api/me/notifications/read-all", {
      method: "POST",
      credentials: "include"
    });
    if (!response.ok) return;
    setItems((prev) => prev.map((item) => ({ ...item, isRead: true })));
    setUnreadCount(0);
    unreadCountRef.current = 0;
    setBadgeCount(0);
  }

  useEffect(() => {
    void fetchNotifications().catch(() => setLoading(false));
  }, [fetchNotifications]);

  useEffect(() => {
    if (!open) return;
    void fetchNotifications({ resetBadge: true }).catch(() => setLoading(false));
  }, [fetchNotifications, open]);

  useEffect(() => {
    function refreshNotifications(event: Event) {
      const detail = event instanceof CustomEvent ? (event.detail as { suppressToast?: boolean } | undefined) : undefined;
      void fetchNotifications({ showRealtimeToast: !detail?.suppressToast }).catch(() => setLoading(false));
    }

    window.addEventListener("dcreator:notifications-refresh", refreshNotifications);
    return () => window.removeEventListener("dcreator:notifications-refresh", refreshNotifications);
  }, [fetchNotifications]);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      if (document.visibilityState !== "visible") return;
      void fetchNotifications({ showRealtimeToast: true }).catch(() => setLoading(false));
    }, 5000);

    return () => window.clearInterval(intervalId);
  }, [fetchNotifications]);

  return (
    <div className="relative">
      <button
        type="button"
        className="relative inline-flex h-10 w-10 items-center justify-center rounded-full border border-zinc-200 bg-white text-zinc-700 transition hover:bg-zinc-100"
        onClick={() => {
          setOpen((prev) => {
            const nextOpen = !prev;
            if (nextOpen) setBadgeCount(0);
            return nextOpen;
          });
        }}
        aria-label="Thông báo"
      >
        <Bell size={18} weight="regular" />
        {badgeCount > 0 ? (
          <span className="absolute -right-1 -top-1 inline-flex min-h-5 min-w-5 items-center justify-center rounded-full bg-red-600 px-1 text-[11px] font-bold text-white">
            {badgeCount > 99 ? "99+" : badgeCount}
          </span>
        ) : null}
      </button>

      {open ? (
        <div className="absolute right-0 z-50 mt-2 w-[min(92vw,24rem)] overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-xl">
          <div className="flex items-center justify-between border-b border-zinc-100 px-4 py-3">
            <div>
              <p className="text-sm font-semibold text-zinc-900">Thông báo</p>
              <p className="text-xs text-zinc-500">{unreadCount > 0 ? `${unreadCount} thông báo chưa đọc` : "Bạn đã xem hết thông báo mới"}</p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <button
                type="button"
                onClick={() => void onReadAll()}
                className="rounded-full border border-zinc-200 px-2.5 py-1 text-xs font-semibold text-zinc-700 hover:bg-zinc-100 disabled:opacity-50"
                disabled={unreadCount === 0}
              >
                Đọc tất cả
              </button>
              <Link href="/notifications" onClick={() => setOpen(false)} className="text-sm font-semibold text-zinc-700 hover:text-zinc-900">
                Xem tất cả
              </Link>
            </div>
          </div>

          <div className="max-h-[28rem] overflow-y-auto p-2">
            {loading ? <p className="px-2 py-3 text-sm text-zinc-500">Đang tải thông báo...</p> : null}
            {!loading && topItems.length === 0 ? <p className="px-2 py-3 text-sm text-zinc-500">Chưa có thông báo mới.</p> : null}
            {!loading &&
              topItems.map((item) => (
                <article
                  key={item.id}
                  className={`rounded-xl border px-3 py-3 ${item.isRead ? "border-zinc-100 bg-white" : "border-zinc-200 bg-zinc-50"}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-zinc-900">{normalizeNotificationText(item.title)}</p>
                      <p className="mt-1 text-sm text-zinc-600">{normalizeNotificationText(item.content)}</p>
                      <p className="mt-2 text-xs text-zinc-400">{formatNotificationDateTime(item.createdAt)}</p>
                    </div>
                    {!item.isRead ? (
                      <button
                        type="button"
                        onClick={() => void onRead(item.id)}
                        className="shrink-0 rounded-full border border-zinc-200 px-2.5 py-1 text-xs font-semibold text-zinc-700 hover:bg-zinc-100"
                      >
                        Đã đọc
                      </button>
                    ) : null}
                  </div>
                </article>
              ))}
          </div>
        </div>
      ) : null}
      {realtimeToast ? <ActionToast message={realtimeToast} tone="info" /> : null}
    </div>
  );
}
