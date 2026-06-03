"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Bell } from "@phosphor-icons/react";

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

function formatDateTime(value: string) {
  return new Date(value).toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const topItems = useMemo(() => items.slice(0, 6), [items]);

  async function fetchNotifications() {
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
    setItems(payload.data?.items ?? []);
    setUnreadCount(payload.data?.unreadCount ?? 0);
    setLoading(false);
  }

  async function onRead(id: string) {
    const response = await fetch(`/api/me/notifications/${id}/read`, {
      method: "POST",
      credentials: "include"
    });
    if (!response.ok) return;
    setItems((prev) => prev.map((item) => (item.id === id ? { ...item, isRead: true } : item)));
    setUnreadCount((prev) => Math.max(0, prev - 1));
  }

  useEffect(() => {
    void fetchNotifications().catch(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!open) return;
    void fetchNotifications().catch(() => setLoading(false));
  }, [open]);

  return (
    <div className="relative">
      <button
        type="button"
        className="relative inline-flex h-10 w-10 items-center justify-center rounded-full border border-zinc-200 bg-white text-zinc-700 transition hover:bg-zinc-100"
        onClick={() => setOpen((prev) => !prev)}
        aria-label="Thông báo"
      >
        <Bell size={18} weight="regular" />
        {unreadCount > 0 ? (
          <span className="absolute -right-1 -top-1 inline-flex min-h-5 min-w-5 items-center justify-center rounded-full bg-red-600 px-1 text-[11px] font-bold text-white">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        ) : null}
      </button>

      {open ? (
        <div className="absolute right-0 z-50 mt-2 w-[min(92vw,24rem)] overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-xl">
          <div className="flex items-center justify-between border-b border-zinc-100 px-4 py-3">
            <div>
              <p className="text-sm font-semibold text-zinc-900">Thông báo</p>
              <p className="text-xs text-zinc-500">Cập nhật mới nhất cho workspace Creator</p>
            </div>
            <Link href="/notifications" onClick={() => setOpen(false)} className="text-sm font-semibold text-zinc-700 hover:text-zinc-900">
              Xem tất cả
            </Link>
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
                      <p className="text-sm font-semibold text-zinc-900">{item.title}</p>
                      <p className="mt-1 text-sm text-zinc-600">{item.content}</p>
                      <p className="mt-2 text-xs text-zinc-400">{formatDateTime(item.createdAt)}</p>
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
    </div>
  );
}
