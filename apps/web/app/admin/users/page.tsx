"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { EmptyState, ErrorState, LoadingSkeleton, PageHeader, SectionHeader, StatusBadge } from "@/app/components/dcreator/ui/base";

type UserItem = {
  id: string;
  displayName: string;
  email: string;
  role: string;
  isActive: boolean;
  wallet?: { pointsBalance: number; cashBalanceVnd: number };
};

export default function AdminUsersPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [items, setItems] = useState<UserItem[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const url = query.trim() ? `/api/admin/dashboard/users?query=${encodeURIComponent(query.trim())}&page=1&limit=50` : "/api/admin/dashboard/users?page=1&limit=50";
      const res = await fetch(url, { cache: "no-store" });
      const body = await res.json();
      if (!res.ok || !body.success) throw new Error(body.error ?? "Load users failed");
      setItems(body.data.items);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Load users failed");
    } finally {
      setLoading(false);
    }
  }, [query]);

  useEffect(() => {
    void load();
  }, [load]);

  async function toggleLock(userId: string, isActive: boolean) {
    const endpoint = isActive ? "lock" : "unlock";
    const res = await fetch(`/api/admin/dashboard/users/${userId}/${endpoint}`, { method: "POST" });
    const body = await res.json();
    if (!res.ok || !body.success) {
      setError(body.error ?? "Update user failed");
      return;
    }
    await load();
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    void load();
  }

  return (
    <>
      <PageHeader title="Users CMS" subtitle="Quản lý danh sách user, role và khóa/mở tài khoản." />
      <section className="dc-card p-4">
        <form className="flex gap-2" onSubmit={onSubmit}>
          <input className="dc-input" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Tìm theo tên hoặc email" />
          <button className="dc-btn-primary" type="submit">Search</button>
        </form>
      </section>
      {error ? <div className="mt-4"><ErrorState title="Không tải được users" description={error} onRetry={() => void load()} /></div> : null}
      {loading ? <div className="mt-4"><LoadingSkeleton rows={5} /></div> : null}
      {!loading && !error ? (
        <section className="mt-6">
          <SectionHeader title="User List" subtitle={`Tổng ${items.length} users`} />
          {items.length === 0 ? (
            <EmptyState title="Không có dữ liệu" description="Không tìm thấy user phù hợp." />
          ) : (
            <div className="dc-card overflow-auto">
              <table className="w-full min-w-[760px] text-sm">
                <thead className="bg-zinc-50 text-zinc-600">
                  <tr>
                    <th className="px-4 py-3 text-left">User</th>
                    <th className="px-4 py-3 text-left">Role</th>
                    <th className="px-4 py-3 text-left">Status</th>
                    <th className="px-4 py-3 text-left">Wallet</th>
                    <th className="px-4 py-3 text-left">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => (
                    <tr key={item.id} className="border-t border-zinc-100">
                      <td className="px-4 py-3">
                        <p className="font-semibold">{item.displayName}</p>
                        <p className="text-xs text-zinc-500">{item.email}</p>
                      </td>
                      <td className="px-4 py-3">{item.role}</td>
                      <td className="px-4 py-3">{item.isActive ? <StatusBadge status="active" /> : <StatusBadge status="rejected" />}</td>
                      <td className="px-4 py-3">
                        <p>{(item.wallet?.pointsBalance ?? 0).toLocaleString("vi-VN")} points</p>
                        <p className="text-xs text-zinc-500">{(item.wallet?.cashBalanceVnd ?? 0).toLocaleString("vi-VN")} VND</p>
                      </td>
                      <td className="px-4 py-3">
                        <button className={item.isActive ? "dc-btn-secondary" : "dc-btn-primary"} onClick={() => void toggleLock(item.id, item.isActive)}>
                          {item.isActive ? "Lock" : "Unlock"}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      ) : null}
    </>
  );
}
