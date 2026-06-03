"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowClockwise, Bell, CheckCircle, FunnelSimple, MagnifyingGlass } from "@phosphor-icons/react";
import { EmptyState, ErrorState, LoadingSkeleton, PageHeader } from "@/app/components/dcreator/ui/base";
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
  error?: string;
};

type FilterKey = "all" | "unread" | "read";

const filterLabels: Record<FilterKey, string> = {
  all: "Tất cả",
  unread: "Chưa đọc",
  read: "Đã đọc"
};

function notificationTone(item: NotificationItem) {
  const text = `${normalizeNotificationText(item.title)} ${normalizeNotificationText(item.content)}`.toLowerCase();
  if (text.includes("từ chối") || text.includes("rejected") || text.includes("thất bại")) return "border-red-200 bg-red-50 text-red-700";
  if (text.includes("duyệt") || text.includes("hoàn thành") || text.includes("thành công") || text.includes("approved")) return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (text.includes("chờ") || text.includes("pending") || text.includes("cần")) return "border-amber-200 bg-amber-50 text-amber-700";
  return "border-zinc-200 bg-zinc-100 text-zinc-700";
}

function notificationCategory(item: NotificationItem) {
  const text = `${normalizeNotificationText(item.title)} ${normalizeNotificationText(item.content)}`.toLowerCase();
  if (text.includes("campaign")) return "Campaign";
  if (text.includes("nhiệm vụ") || text.includes("mission") || text.includes("video") || text.includes("proof")) return "Nhiệm vụ";
  if (text.includes("creator") || text.includes("brand") || text.includes("hồ sơ") || text.includes("kênh")) return "Hồ sơ";
  if (text.includes("thanh toán") || text.includes("payout") || text.includes("voucher")) return "Tài chính";
  return "Hệ thống";
}

export function NotificationsPageClient() {
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [activeFilter, setActiveFilter] = useState<FilterKey>("all");
  const [query, setQuery] = useState("");

  const filteredItems = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    return items.filter((item) => {
      if (activeFilter === "unread" && item.isRead) return false;
      if (activeFilter === "read" && !item.isRead) return false;
      if (!keyword) return true;

      const title = normalizeNotificationText(item.title).toLowerCase();
      const content = normalizeNotificationText(item.content).toLowerCase();
      return title.includes(keyword) || content.includes(keyword) || notificationCategory(item).toLowerCase().includes(keyword);
    });
  }, [activeFilter, items, query]);

  const readCount = Math.max(0, items.length - unreadCount);

  const fetchNotifications = useCallback(async (options?: { silent?: boolean }) => {
    if (options?.silent) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError("");

    try {
      const response = await fetch("/api/me/notifications?limit=100", {
        method: "GET",
        credentials: "include",
        cache: "no-store"
      });
      const payload = (await response.json()) as NotificationApiResponse;
      if (!response.ok || !payload.success) throw new Error(payload.error ?? "Không thể tải thông báo");

      setItems(payload.data?.items ?? []);
      setUnreadCount(payload.data?.unreadCount ?? 0);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Không thể tải thông báo");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  async function onRead(id: string) {
    const response = await fetch(`/api/me/notifications/${id}/read`, {
      method: "POST",
      credentials: "include"
    });
    if (!response.ok) return;
    setItems((prev) => prev.map((item) => (item.id === id ? { ...item, isRead: true } : item)));
    setUnreadCount((prev) => Math.max(0, prev - 1));
  }

  async function markAllAsRead() {
    const unreadItems = items.filter((item) => !item.isRead);
    await Promise.all(unreadItems.map((item) => fetch(`/api/me/notifications/${item.id}/read`, { method: "POST", credentials: "include" })));
    setItems((prev) => prev.map((item) => ({ ...item, isRead: true })));
    setUnreadCount(0);
  }

  useEffect(() => {
    void fetchNotifications().catch(() => setLoading(false));
  }, [fetchNotifications]);

  return (
    <main className="min-h-screen bg-zinc-50 pb-24">
      <section className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
        <PageHeader
          title="Thông báo"
          subtitle="Theo dõi cập nhật từ campaign, nhiệm vụ, hồ sơ Creator và các duyệt xét trong workspace."
          action={
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => void fetchNotifications({ silent: true })}
                className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-white px-4 py-2 text-sm font-semibold text-zinc-700 hover:bg-zinc-100"
                disabled={refreshing}
              >
                <ArrowClockwise size={16} />
                {refreshing ? "Đang làm mới..." : "Làm mới"}
              </button>
              <button
                type="button"
                onClick={() => void markAllAsRead()}
                className="inline-flex items-center gap-2 rounded-full bg-zinc-900 px-4 py-2 text-sm font-semibold text-white hover:bg-zinc-800 disabled:opacity-50"
                disabled={unreadCount === 0}
              >
                <CheckCircle size={16} />
                Đánh dấu tất cả đã đọc
              </button>
            </div>
          }
        />

        <div className="mb-4 grid gap-3 md:grid-cols-3">
          <article className="dc-card p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Tổng thông báo</p>
            <p className="mt-2 text-3xl font-black text-zinc-900">{items.length.toLocaleString("vi-VN")}</p>
          </article>
          <article className="dc-card p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Chưa đọc</p>
            <p className="mt-2 text-3xl font-black text-red-600">{unreadCount.toLocaleString("vi-VN")}</p>
          </article>
          <article className="dc-card p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Đã đọc</p>
            <p className="mt-2 text-3xl font-black text-emerald-600">{readCount.toLocaleString("vi-VN")}</p>
          </article>
        </div>

        <section className="dc-card overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-100 p-4">
            <div className="flex flex-wrap items-center gap-2">
              <FunnelSimple size={18} className="text-zinc-500" />
              {(Object.keys(filterLabels) as FilterKey[]).map((filter) => (
                <button
                  key={filter}
                  type="button"
                  onClick={() => setActiveFilter(filter)}
                  className={`rounded-full px-3 py-1.5 text-sm font-semibold transition ${
                    activeFilter === filter ? "bg-zinc-900 text-white" : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
                  }`}
                >
                  {filterLabels[filter]}
                </button>
              ))}
            </div>

            <label className="relative min-w-[220px] flex-1 sm:max-w-sm">
              <MagnifyingGlass size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
              <input
                className="w-full rounded-full border border-zinc-200 bg-white py-2 pl-9 pr-3 text-sm text-zinc-700 outline-none focus:border-zinc-400"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Tìm theo nội dung, loại thông báo..."
              />
            </label>
          </div>

          <div className="grid gap-3 p-4">
            {error ? <ErrorState title="Không thể tải thông báo" description={error} onRetry={() => void fetchNotifications()} /> : null}
            {loading ? <LoadingSkeleton rows={5} /> : null}
            {!loading && !error && filteredItems.length === 0 ? (
              <EmptyState title="Không có thông báo phù hợp" description="Thử đổi bộ lọc hoặc làm mới danh sách để kiểm tra cập nhật mới." />
            ) : null}

            {!loading && !error
              ? filteredItems.map((item) => (
                  <article key={item.id} className={`rounded-2xl border p-4 transition ${item.isRead ? "border-zinc-100 bg-white" : "border-zinc-200 bg-zinc-50 shadow-sm"}`}>
                    <div className="flex items-start gap-3">
                      <span className={`mt-0.5 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border ${notificationTone(item)}`}>
                        <Bell size={18} weight={item.isRead ? "regular" : "fill"} />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="font-bold text-zinc-900">{normalizeNotificationText(item.title)}</p>
                              {!item.isRead ? <span className="rounded-full bg-red-600 px-2 py-0.5 text-[11px] font-bold text-white">Mới</span> : null}
                              <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[11px] font-semibold text-zinc-600">{notificationCategory(item)}</span>
                            </div>
                            <p className="mt-1 text-sm leading-6 text-zinc-600">{normalizeNotificationText(item.content)}</p>
                            <p className="mt-2 text-xs text-zinc-400">{formatNotificationDateTime(item.createdAt)}</p>
                          </div>
                          {!item.isRead ? (
                            <button
                              type="button"
                              onClick={() => void onRead(item.id)}
                              className="shrink-0 rounded-full border border-zinc-200 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-700 hover:bg-zinc-100"
                            >
                              Đã đọc
                            </button>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  </article>
                ))
              : null}
          </div>
        </section>
      </section>
    </main>
  );
}
