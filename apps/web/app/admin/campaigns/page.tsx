"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AdminTabs } from "@/app/admin/_components/AdminTabs";
import { ManagementActionMenu } from "@/app/admin/_components/ManagementActionMenu";
import { ActionToast, EmptyState, ErrorState, LoadingSkeleton, PageHeader, StatusBadge } from "@/app/components/dcreator/ui/base";
import { ReviewActionDialog } from "@/app/admin/_components/ReviewActionDialog";

type ApiResult<T> = { success: boolean; data: T; error?: string };
type CampaignItem = { id: string; slug: string; title: string; brief: string; status: string; statusView?: string; budgetVnd: number; targetAmountVnd: number; fundedAmountVnd: number; brand: { displayName: string; email: string }; endsAt?: string | null };

const tabs = [
  { key: "", label: "Tất cả" },
  { key: "PENDING_REVIEW", label: "Chờ duyệt" },
  { key: "ACTIVE", label: "Đang chạy" },
  { key: "PAUSED", label: "Tạm dừng" },
  { key: "EXPIRING", label: "Sắp hết hạn" },
  { key: "COMPLETED", label: "Hoàn thành" },
  { key: "AUDIT", label: "Chờ đối soát" },
  { key: "REJECTED", label: "Bị từ chối" },
  { key: "RISK", label: "Có rủi ro" }
];

export default function AdminCampaignsPage() {
  const [items, setItems] = useState<CampaignItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("PENDING_REVIEW");
  const [query, setQuery] = useState("");
  const [toast, setToast] = useState("");
  const [acting, setActing] = useState(false);
  const [action, setAction] = useState<{ type: "pause" | "resume" | "audit" | "force-close" | "mark-completed"; id: string } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      if (status && !["EXPIRING", "AUDIT", "RISK"].includes(status)) params.set("status", status);
      if (query.trim()) params.set("query", query.trim());
      const res = await fetch(`/api/admin/campaigns?${params.toString()}`, { cache: "no-store" });
      const body = (await res.json()) as ApiResult<CampaignItem[]>;
      if (!res.ok || !body.success) throw new Error(body.error ?? "Không tải được campaigns");
      setItems(body.data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Không tải được campaigns");
    } finally {
      setLoading(false);
    }
  }, [query, status]);

  useEffect(() => { void load(); }, [load]);

  const filtered = useMemo(() => {
    if (status === "EXPIRING") {
      const now = Date.now();
      const in3Days = now + 3 * 24 * 60 * 60 * 1000;
      return items.filter((i) => i.endsAt && new Date(i.endsAt).getTime() <= in3Days);
    }
    if (status === "RISK") return items.filter((i) => i.fundedAmountVnd > i.targetAmountVnd * 2);
    if (status === "AUDIT") return items.filter((i) => (i.statusView ?? i.status) === "COMPLETED");
    return items;
  }, [items, status]);

  return (
    <>
      <PageHeader title="Quản lý Campaign / Job" subtitle="Theo dõi vận hành campaign, can thiệp trạng thái và đối soát." action={<button className="dc-btn-secondary" onClick={() => void load()}>Làm mới</button>} />
      <section className="dc-card p-4 grid gap-3">
        <AdminTabs items={tabs} value={status} onChange={setStatus} />
        <div className="flex gap-2">
          <input className="dc-input" placeholder="Tìm campaign/brand" value={query} onChange={(e) => setQuery(e.target.value)} />
          <button className="dc-btn-primary" onClick={() => void load()}>Lọc</button>
        </div>
      </section>
      {loading ? <div className="mt-4"><LoadingSkeleton rows={4} /></div> : null}
      {error ? <div className="mt-4"><ErrorState title="Không tải được campaign" description={error} onRetry={() => void load()} /></div> : null}
      {!loading && !error ? (
        filtered.length === 0 ? <div className="mt-4"><EmptyState title="Không có dữ liệu" description="Không có campaign phù hợp bộ lọc." /></div> : (
          <div className="mt-4 grid gap-3">
            {filtered.map((campaign) => (
              <article key={campaign.id} className="dc-card p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold text-zinc-900">{campaign.title}</p>
                    <p className="text-sm text-zinc-600">/{campaign.slug} • {campaign.brand.displayName}</p>
                  </div>
                  <StatusBadge status={(campaign.statusView ?? campaign.status).toLowerCase()} />
                </div>
                <p className="mt-2 line-clamp-2 text-sm text-zinc-600">{campaign.brief}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Link className="dc-btn-primary" href={`/admin/campaigns/${campaign.id}`}>Chi tiết</Link>
                  <ManagementActionMenu
                    items={[
                      { key: "pause", label: "Tạm dừng campaign" },
                      { key: "resume", label: "Tiếp tục campaign" },
                      { key: "mark-completed", label: "Mark completed" },
                      { key: "audit", label: "Chuyển đối soát" },
                      { key: "force-close", label: "Force close", danger: true }
                    ]}
                    onSelect={(key) => {
                      if (key === "pause") setAction({ type: "pause", id: campaign.id });
                      if (key === "resume") setAction({ type: "resume", id: campaign.id });
                      if (key === "audit") setAction({ type: "audit", id: campaign.id });
                      if (key === "force-close") setAction({ type: "force-close", id: campaign.id });
                      if (key === "mark-completed") setAction({ type: "mark-completed", id: campaign.id });
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
        title="Xác nhận action campaign"
        description="Bắt buộc nhập lý do để ghi audit log."
        requireReason
        submitting={acting}
        onCancel={() => !acting && setAction(null)}
        onConfirm={async (reason) => {
          if (!action) return;
          setActing(true);
          try {
            let endpoint = "";
            if (action.type === "pause") endpoint = "pause";
            if (action.type === "resume") endpoint = "resume";
            if (action.type === "audit") endpoint = "move-to-audit";
            if (action.type === "force-close") endpoint = "force-close";
            if (action.type === "mark-completed") endpoint = "mark-completed";
            const res = await fetch(`/api/admin/campaigns/${action.id}/${endpoint}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ reason })
            });
            const body = await res.json();
            if (!res.ok || !body.success) throw new Error(body.error ?? "Thao tác thất bại");
            setToast("Đã cập nhật campaign");
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
