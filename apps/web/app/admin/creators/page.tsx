"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AdminTabs } from "@/app/admin/_components/AdminTabs";
import { ManagementActionMenu } from "@/app/admin/_components/ManagementActionMenu";
import { ActionToast, EmptyState, ErrorState, LoadingSkeleton, PageHeader, StatusBadge } from "@/app/components/dcreator/ui/base";
import { ReviewActionDialog } from "@/app/admin/_components/ReviewActionDialog";

type Item = { id: string; status: string; displayName: string; mainPlatform: string; socialUrl: string; contentCategory: string | null; account: { email: string }; createdAt: string };
type ApiResult<T> = { success: boolean; data: T; error?: string };

const tabs = [
  { key: "", label: "Tất cả" },
  { key: "PENDING_REVIEW", label: "Chờ kiểm tra rủi ro" },
  { key: "NEEDS_REVISION", label: "Cần bổ sung" },
  { key: "APPROVED", label: "Đã duyệt" },
  { key: "REJECTED", label: "Bị từ chối" },
  { key: "SUSPENDED", label: "Bị khóa" },
  { key: "RISK", label: "Có rủi ro" }
];

export default function AdminCreatorsPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [query, setQuery] = useState("");
  const [toast, setToast] = useState("");
  const [acting, setActing] = useState(false);
  const [action, setAction] = useState<{ type: "suspend" | "unsuspend"; id: string } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      if (status && status !== "SUSPENDED" && status !== "RISK") params.set("status", status);
      if (query.trim()) params.set("query", query.trim());
      const res = await fetch(`/api/admin/creators?${params.toString()}`, { cache: "no-store" });
      const body = (await res.json()) as ApiResult<Item[]>;
      if (!res.ok || !body.success) throw new Error(body.error ?? "Tải danh sách Creator thất bại");
      setItems(body.data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Tải danh sách Creator thất bại");
    } finally {
      setLoading(false);
    }
  }, [query, status]);

  useEffect(() => { void load(); }, [load]);

  const filtered = useMemo(() => {
    if (status === "RISK") return items.filter((x) => x.mainPlatform === "OTHER");
    if (status === "SUSPENDED") return [];
    return items;
  }, [items, status]);

  return (
    <>
      <PageHeader title="Quản lý Creator" subtitle="Giám sát rủi ro, moderation và trạng thái vận hành Creator (không dùng để duyệt onboarding ban đầu)." action={<button className="dc-btn-secondary" onClick={() => void load()}>Làm mới</button>} />
      <section className="dc-card p-4 grid gap-3">
        <AdminTabs items={tabs} value={status} onChange={setStatus} />
        <div className="flex gap-2">
          <input className="dc-input" placeholder="Tìm theo tên/email/social" value={query} onChange={(e) => setQuery(e.target.value)} />
          <button className="dc-btn-primary" onClick={() => void load()}>Lọc</button>
        </div>
      </section>
      {loading ? <div className="mt-4"><LoadingSkeleton rows={4} /></div> : null}
      {error ? <div className="mt-4"><ErrorState title="Không tải được Creator" description={error} onRetry={() => void load()} /></div> : null}
      {!loading && !error ? (
        filtered.length === 0 ? <div className="mt-4"><EmptyState title="Không có dữ liệu" description="Không có Creator phù hợp bộ lọc." /></div> : (
          <div className="mt-4 grid gap-3">
            {filtered.map((item) => (
              <article key={item.id} className="dc-card p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold">{item.displayName}</p>
                    <p className="text-xs text-zinc-500">{item.mainPlatform} • {item.contentCategory ?? "-"} • {item.account.email}</p>
                  </div>
                  <StatusBadge status={item.status.toLowerCase()} />
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Link className="dc-btn-primary" href={`/admin/creators/${item.id}`}>Chi tiết</Link>
                  <ManagementActionMenu
                    items={[
                      { key: "proofs", label: "Xem proofs" },
                      { key: "campaigns", label: "Xem campaigns" },
                      { key: "wallet", label: "Xem ví/hoa hồng" },
                      { key: "suspend", label: "Suspend", danger: true },
                      { key: "unsuspend", label: "Unsuspend" }
                    ]}
                    onSelect={(key) => {
                      if (key === "proofs") window.location.href = "/admin/proofs";
                      if (key === "campaigns") window.location.href = "/admin/campaigns";
                      if (key === "wallet") window.location.href = "/admin/finance";
                      if (key === "suspend") setAction({ type: "suspend", id: item.id });
                      if (key === "unsuspend") setAction({ type: "unsuspend", id: item.id });
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
        title={action?.type === "suspend" ? "Suspend creator" : "Unsuspend creator"}
        description="Bắt buộc nhập lý do để ghi audit log."
        requireReason
        submitting={acting}
        onCancel={() => !acting && setAction(null)}
        onConfirm={async (reason) => {
          if (!action) return;
          setActing(true);
          try {
            const endpoint = action.type === "suspend" ? "suspend" : "unsuspend";
            const res = await fetch(`/api/admin/creators/${action.id}/${endpoint}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ reason })
            });
            const body = await res.json();
            if (!res.ok || !body.success) throw new Error(body.error ?? "Thao tác thất bại");
            setToast(action.type === "suspend" ? "Đã suspend Creator" : "Đã unsuspend Creator");
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
