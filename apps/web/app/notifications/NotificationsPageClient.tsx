"use client";

import { useEffect, useState } from "react";

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

export function NotificationsPageClient() {
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  async function fetchNotifications() {
    const response = await fetch("/api/me/notifications?limit=100", {
      method: "GET",
      credentials: "include"
    });
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
    <section className="container">
      <h1>My Notifications</h1>
      <p>Unread: {unreadCount}</p>
      {loading ? <p>Đang tải...</p> : null}
      {!loading &&
        items.map((item) => (
          <article key={item.id} className="card">
            <p>
              <strong>{item.title}</strong>
            </p>
            <p>{item.content}</p>
            <p>{new Date(item.createdAt).toLocaleString()}</p>
            {!item.isRead ? (
              <button type="button" onClick={() => onRead(item.id)}>
                Mark as read
              </button>
            ) : null}
          </article>
        ))}
    </section>
  );
}
