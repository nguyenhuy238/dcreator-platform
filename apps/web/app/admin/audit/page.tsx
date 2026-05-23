"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { EmptyState, ErrorState, LoadingSkeleton, PageHeader, SectionHeader } from "@/app/components/dcreator/ui/base";

type LogItem = { id: string; action: string; targetType: string; targetId: string; createdAt: string; metadata?: unknown };

export default function AdminAuditPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [action, setAction] = useState("");
  const [targetType, setTargetType] = useState("");
  const [items, setItems] = useState<LogItem[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const query = new URLSearchParams();
      if (action.trim()) query.set("action", action.trim());
      if (targetType.trim()) query.set("targetType", targetType.trim());
      query.set("page", "1");
      query.set("limit", "100");
      const res = await fetch(`/api/admin/dashboard/audit-logs?${query.toString()}`, { cache: "no-store" });
      const body = await res.json();
      if (!res.ok || !body.success) throw new Error(body.error ?? "Tải nhật ký kiểm toán thất bại");
      setItems(body.data.items);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Tải nhật ký kiểm toán thất bại");
    } finally {
      setLoading(false);
    }
  }, [action, targetType]);

  useEffect(() => {
    void load();
  }, [load]);

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    void load();
  }

  return (
    <>
      <PageHeader title="Audit CMS" subtitle="Theo dõi toàn bộ log hành động quản trị." />
      <section className="dc-card p-4">
        <form className="grid gap-3 md:grid-cols-3" onSubmit={onSubmit}>
          <input className="dc-input" placeholder="Action" value={action} onChange={(e) => setAction(e.target.value)} />
          <input className="dc-input" placeholder="Target type" value={targetType} onChange={(e) => setTargetType(e.target.value)} />
          <button className="dc-btn-primary" type="submit">Filter</button>
        </form>
      </section>
      {error ? <div className="mt-4"><ErrorState title="Không tải được audit logs" description={error} onRetry={() => void load()} /></div> : null}
      {loading ? <div className="mt-4"><LoadingSkeleton rows={5} /></div> : null}
      {!loading && !error ? (
        <section className="mt-6">
          <SectionHeader title="Audit Log Entries" subtitle={`Tổng ${items.length} dòng`} />
          {items.length === 0 ? (
            <EmptyState title="Không có audit logs" description="Không có bản ghi phù hợp bộ lọc." />
          ) : (
            <div className="dc-card overflow-auto">
              <table className="w-full min-w-[900px] text-sm">
                <thead className="bg-zinc-50 text-zinc-600">
                  <tr>
                    <th className="px-4 py-3 text-left">Action</th>
                    <th className="px-4 py-3 text-left">Target</th>
                    <th className="px-4 py-3 text-left">When</th>
                    <th className="px-4 py-3 text-left">Metadata</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => (
                    <tr key={item.id} className="border-t border-zinc-100 align-top">
                      <td className="px-4 py-3 font-medium">{item.action}</td>
                      <td className="px-4 py-3">{item.targetType} / {item.targetId.slice(0, 10)}***</td>
                      <td className="px-4 py-3">{new Date(item.createdAt).toLocaleString("vi-VN")}</td>
                      <td className="px-4 py-3 text-xs text-zinc-500">{item.metadata ? JSON.stringify(item.metadata) : "Không có"}</td>
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
