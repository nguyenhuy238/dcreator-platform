"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AdminTabs } from "@/app/admin/_components/AdminTabs";
import { ManagementActionMenu } from "@/app/admin/_components/ManagementActionMenu";
import { ActionToast, EmptyState, ErrorState, LoadingSkeleton, PageHeader, StatusBadge } from "@/app/components/dcreator/ui/base";
import { ReviewActionDialog } from "@/app/admin/_components/ReviewActionDialog";

type Item = { id: string; status: string; brandName: string; industry: string | null; contactEmail: string; account: { email: string; displayName: string }; createdAt: string };
type ApiResult<T> = { success: boolean; data: T; error?: string };

const tabs = [
  { key: "", label: "Tất cả" },
  { key: "PENDING_REVIEW", label: "Chờ duyệt" },
  { key: "NEEDS_REVISION", label: "Cần bổ sung" },
  { key: "APPROVED", label: "Đã xác minh" },
  { key: "REJECTED", label: "Bị từ chối" },
  { key: "LOCKED", label: "Bị khóa" },
  { key: "RISK", label: "Có rủi ro" }
];

export default function AdminBrandsPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("PENDING_REVIEW");
  const [query, setQuery] = useState("");
  const [toast, setToast] = useState("");
  const [acting, setActing] = useState(false);
  const [action, setAction] = useState<{ type: "lock" | "unlock" | "pause-campaigns"; id: string } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      if (status && status !== "LOCKED" && status !== "RISK") params.set("status", status);
      if (query.trim()) params.set("query", query.trim());
      const res = await fetch(`/api/admin/brands?${params.toString()}`, { cache: "no-store" });
      const body = (await res.json()) as ApiResult<Item[]>;
      if (!res.ok || !body.success) throw new Error(body.error ?? "Tải danh sách Brand thất bại");
      setItems(body.data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Tải danh sách Brand thất bại");
    } finally {
      setLoading(false);
    }
  }, [query, status]);

  useEffect(() => { void load(); }, [load]);

  const filtered = useMemo(() => {
    if (status === "RISK") return items.filter((x) => !x.industry);
    if (status === "LOCKED") return [];
    return items;
  }, [items, status]);

  return (
    <>
      <PageHeader title="Quản lý Brand" subtitle="Quản lý KYB, credit balance, trạng thái vận hành và rủi ro Brand." action={<button className="dc-btn-secondary" onClick={() => void load()}>Làm mới</button>} />
      <section className="dc-card p-4 grid gap-3">
        <AdminTabs items={tabs} value={status} onChange={setStatus} />
        <div className="flex gap-2">
          <input className="dc-input" placeholder="Tìm brand/email/industry" value={query} onChange={(e) => setQuery(e.target.value)} />
          <button className="dc-btn-primary" onClick={() => void load()}>Lọc</button>
        </div>
      </section>
      {loading ? <div className="mt-4"><LoadingSkeleton rows={4} /></div> : null}
      {error ? <div className="mt-4"><ErrorState title="Không tải được Brand" description={error} onRetry={() => void load()} /></div> : null}
      {!loading && !error ? (
        filtered.length === 0 ? <div className="mt-4"><EmptyState title="Không có dữ liệu" description="Không có Brand phù hợp bộ lọc." /></div> : (
          <div className="mt-4 grid gap-3">
            {filtered.map((item) => (
              <article key={item.id} className="dc-card p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold">{item.brandName}</p>
                    <p className="text-xs text-zinc-500">{item.industry ?? "-"} • {item.contactEmail}</p>
                  </div>
                  <StatusBadge status={item.status.toLowerCase()} />
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Link className="dc-btn-primary" href={`/admin/brands/${item.id}`}>Chi tiết</Link>
                  <ManagementActionMenu
                    items={[
                      { key: "pause", label: "Tạm dừng campaigns" },
                      { key: "finance", label: "Điều chỉnh credit" },
                      { key: "lock", label: "Khóa Brand", danger: true },
                      { key: "unlock", label: "Mở khóa Brand" }
                    ]}
                    onSelect={(key) => {
                      if (key === "finance") window.location.href = "/admin/finance";
                      if (key === "pause") setAction({ type: "pause-campaigns", id: item.id });
                      if (key === "lock") setAction({ type: "lock", id: item.id });
                      if (key === "unlock") setAction({ type: "unlock", id: item.id });
                    }}
                  />
                </div>
              </article>
            ))}
          </div>
        )
      ) : null}
      {toast ? <ActionToast message={toast} /> : null}
      <ReviewActionDialog
        open={Boolean(action)}
        title={action?.type === "lock" ? "Lock Brand" : action?.type === "unlock" ? "Unlock Brand" : "Pause all campaigns"}
        description="Bắt buộc nhập lý do để ghi audit log."
        requireReason
        submitting={acting}
        onCancel={() => !acting && setAction(null)}
        onConfirm={async (reason) => {
          if (!action) return;
          setActing(true);
          try {
            const endpoint =
              action.type === "lock" ? "lock" : action.type === "unlock" ? "unlock" : "pause-campaigns";
            const res = await fetch(`/api/admin/brands/${action.id}/${endpoint}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ reason })
            });
            const body = await res.json();
            if (!res.ok || !body.success) throw new Error(body.error ?? "Thao tác thất bại");
            setToast("Đã cập nhật trạng thái Brand");
            setTimeout(() => setToast(""), 2000);
            setAction(null);
            await load();
          } catch (e) {
            setError(e instanceof Error ? e.message : "Thao tác thất bại");
          } finally {
            setActing(false);
          }
        }}
      />
    </>
  );
}
