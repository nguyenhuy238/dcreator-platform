"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

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
  const [loading, setLoading] = useState(true);

  const topItems = useMemo(() => items.slice(0, 5), [items]);

  async function fetchNotifications() {
    const response = await fetch("/api/me/notifications?limit=20", {
      method: "GET",
      credentials: "include"
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
    fetchNotifications().catch(() => setLoading(false));
  }, []);

  return (
    <div className="notification-wrapper">
      <button
        type="button"
        className="notification-bell"
        onClick={() => setOpen((prev) => !prev)}
        aria-label="Notifications"
      >
        🔔
        {unreadCount > 0 ? <span className="notification-badge">{unreadCount}</span> : null}
      </button>
      {open ? (
        <div className="notification-dropdown">
          <div className="notification-header">
            <strong>Notifications</strong>
            <Link href="/notifications" onClick={() => setOpen(false)}>
              View all
            </Link>
          </div>
          {loading ? <p>Loading...</p> : null}
          {!loading && topItems.length === 0 ? <p>No notifications.</p> : null}
          {!loading &&
            topItems.map((item) => (
              <article key={item.id} className={`notification-item ${item.isRead ? "read" : "unread"}`}>
                <p>
                  <strong>{item.title}</strong>
                </p>
                <p>{item.content}</p>
                {!item.isRead ? (
                  <button type="button" onClick={() => onRead(item.id)}>
                    Mark as read
                  </button>
                ) : null}
              </article>
            ))}
        </div>
      ) : null}
    </div>
  );
}
