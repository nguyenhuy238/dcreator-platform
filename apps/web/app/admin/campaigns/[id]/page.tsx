"use client";

import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { ActionToast, ErrorState, LoadingSkeleton, PageHeader, StatusBadge } from "@/app/components/dcreator/ui/base";

type ApiResult<T> = { success: boolean; data: T; error?: string };
type CampaignDetail = {
  id: string;
  title: string;
  brief: string;
  status: string;
  statusView: string;
  startsAt: string | null;
  endsAt: string | null;
  budgetVnd: number;
  brand: { id: string; displayName: string; email: string };
  brandProfile: { id: string; name: string; status: string; commissionRatePercent: number | null; revenueSharePercent: number | null } | null;
  productSubmissions: Array<{
    id: string;
    name: string;
    reviewStatus: string;
    inventoryBatches: Array<{ id: string; quantityRemaining: number; stockStatus: string }>;
  }>;
  rewards: Array<{ id: string; title: string; pointsCost: number; stockTotal: number; stockRemaining: number }>;
  missions: Array<{ id: string; title: string; audience: string }>;
  kpiSnapshot: { targetAmountVnd: number; fundedAmountVnd: number; backerCount: number; contributionCount: number };
  commission: { commissionRatePercent: number | null; revenueSharePercent: number | null };
  quota: { creator: number; user: number };
};

export default function AdminCampaignDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = params?.id;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");
  const [item, setItem] = useState<CampaignDetail | null>(null);
  const [acting, setActing] = useState(false);
  const [reason, setReason] = useState("");

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/campaigns/${id}`, { cache: "no-store" });
      const body = (await res.json()) as ApiResult<CampaignDetail>;
      if (!res.ok || !body.success) throw new Error(body.error ?? "Load campaign detail failed");
      setItem(body.data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Load campaign detail failed");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  async function act(action: "approve" | "reject" | "request-changes" | "pause") {
    if (!item) return;
    if (action !== "approve" && !reason.trim()) {
      setError("Reason is required.");
      return;
    }
    setActing(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/campaigns/${item.id}/${action}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: action === "approve" ? JSON.stringify({}) : JSON.stringify({ reason: reason.trim() })
      });
      const body = (await res.json()) as ApiResult<unknown>;
      if (!res.ok || !body.success) throw new Error(body.error ?? "Action failed");
      setToast("Đã cập nhật trạng thái campaign");
      setTimeout(() => setToast(""), 1800);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Action failed");
    } finally {
      setActing(false);
    }
  }

  if (loading) {
    return (
      <>
        <PageHeader title="Campaign Detail" subtitle="Đang tải dữ liệu..." />
        <LoadingSkeleton rows={6} />
      </>
    );
  }

  if (error || !item) {
    return <ErrorState title="Không tải được campaign detail" description={error || "Unknown error"} onRetry={() => void load()} />;
  }

  return (
    <>
      <PageHeader title={item.title} subtitle={`Brand: ${item.brand.displayName}`} action={<button className="dc-btn-secondary" onClick={() => router.push("/admin/campaigns")}>Back</button>} />
      {error ? <div className="mb-4"><ErrorState title="Có lỗi thao tác" description={error} onRetry={() => void load()} /></div> : null}

      <section className="dc-card p-4">
        <div className="flex items-center justify-between">
          <p className="font-semibold">Campaign status</p>
          <StatusBadge status={item.statusView.toLowerCase()} />
        </div>
        <div className="mt-3 grid gap-2 text-sm text-zinc-700">
          <p>Brief: {item.brief}</p>
          <p>Timeline: {item.startsAt ? new Date(item.startsAt).toLocaleString("vi-VN") : "N/A"} - {item.endsAt ? new Date(item.endsAt).toLocaleString("vi-VN") : "N/A"}</p>
          <p>Budget: {item.budgetVnd.toLocaleString("vi-VN")} VND</p>
          <p>KPI: Target {item.kpiSnapshot.targetAmountVnd.toLocaleString("vi-VN")} / Funded {item.kpiSnapshot.fundedAmountVnd.toLocaleString("vi-VN")} / Backers {item.kpiSnapshot.backerCount}</p>
          <p>Commission: {item.commission.commissionRatePercent ?? "N/A"}% • Revenue share: {item.commission.revenueSharePercent ?? "N/A"}%</p>
          <p>Quota Creator/User: {item.quota.creator} / {item.quota.user}</p>
          <p>Brand approved: {item.brandProfile?.status === "ACTIVE" ? "Yes" : "No"}</p>
        </div>
      </section>

      <section className="mt-4 dc-card p-4">
        <p className="font-semibold">Product / Inventory</p>
        <div className="mt-3 grid gap-2">
          {item.productSubmissions.length === 0 ? (
            <p className="text-sm text-zinc-600">Chưa có sản phẩm/lô hàng gắn vào campaign.</p>
          ) : (
            item.productSubmissions.map((product) => (
              <div key={product.id} className="rounded-xl border border-zinc-200 bg-zinc-50 p-3 text-sm">
                <p className="font-semibold">{product.name}</p>
                <p>Status: {product.reviewStatus}</p>
                <p>Stock remaining: {product.inventoryBatches.reduce((sum, b) => sum + b.quantityRemaining, 0).toLocaleString("vi-VN")}</p>
              </div>
            ))
          )}
        </div>
      </section>

      <section className="mt-4 dc-card p-4">
        <p className="font-semibold">Rewards & missions</p>
        <div className="mt-3 grid gap-2 md:grid-cols-2">
          <div>
            <p className="mb-2 text-sm font-semibold">Rewards</p>
            {item.rewards.length === 0 ? <p className="text-sm text-zinc-600">No rewards</p> : item.rewards.map((reward) => (
              <div key={reward.id} className="mb-2 rounded-xl border border-zinc-200 bg-zinc-50 p-3 text-sm">
                <p className="font-semibold">{reward.title}</p>
                <p>Points: {reward.pointsCost}</p>
                <p>Stock: {reward.stockRemaining}/{reward.stockTotal}</p>
              </div>
            ))}
          </div>
          <div>
            <p className="mb-2 text-sm font-semibold">Missions</p>
            {item.missions.length === 0 ? <p className="text-sm text-zinc-600">No missions</p> : item.missions.map((mission) => (
              <div key={mission.id} className="mb-2 rounded-xl border border-zinc-200 bg-zinc-50 p-3 text-sm">
                <p className="font-semibold">{mission.title}</p>
                <p>Audience: {mission.audience}</p>
                <p>Mission linked for audience {mission.audience}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mt-4 dc-card p-4">
        <p className="font-semibold">Decision</p>
        <textarea className="dc-input mt-3 min-h-24" placeholder="Reason for reject/request changes/pause" value={reason} onChange={(e) => setReason(e.target.value)} />
        <div className="mt-3 flex flex-wrap gap-2">
          <button className="dc-btn-primary" disabled={acting} onClick={() => void act("approve")}>Approve & Publish</button>
          <button className="dc-btn-secondary" disabled={acting} onClick={() => void act("request-changes")}>Request changes</button>
          <button className="dc-btn-secondary" disabled={acting} onClick={() => void act("pause")}>Pause</button>
          <button className="dc-btn-secondary" disabled={acting} onClick={() => void act("reject")}>Reject</button>
        </div>
      </section>

      {toast ? <ActionToast message={toast} /> : null}
    </>
  );
}
