"use client";

import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { ReviewActionDialog } from "@/app/admin/_components/ReviewActionDialog";
import { ActionToast, ErrorState, LoadingSkeleton, PageHeader, SectionCard, StatusBadge } from "@/app/components/dcreator/ui/base";

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
  const [confirmAction, setConfirmAction] = useState<null | "pause" | "reject" | "request-changes">(null);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    title: "",
    brief: "",
    startsAt: "",
    endsAt: "",
    budgetVnd: 0,
    targetAmountVnd: 0
  });

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/campaigns/${id}`, { cache: "no-store" });
      const body = (await res.json()) as ApiResult<CampaignDetail>;
      if (!res.ok || !body.success) throw new Error(body.error ?? "Tải chi tiết chiến dịch thất bại");
      setItem(body.data);
      setEditForm({
        title: body.data.title,
        brief: body.data.brief,
        startsAt: body.data.startsAt ? new Date(body.data.startsAt).toISOString().slice(0, 16) : "",
        endsAt: body.data.endsAt ? new Date(body.data.endsAt).toISOString().slice(0, 16) : "",
        budgetVnd: body.data.budgetVnd,
        targetAmountVnd: body.data.kpiSnapshot.targetAmountVnd
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Tải chi tiết chiến dịch thất bại");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  async function act(action: "approve" | "reject" | "request-changes" | "pause", reason?: string) {
    if (!item) return;
    if (action !== "approve" && !reason?.trim()) {
      setError("Reason is required");
      return;
    }
    setActing(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/campaigns/${item.id}/${action}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: action === "approve" ? JSON.stringify({}) : JSON.stringify({ reason: reason?.trim() })
      });
      const body = (await res.json()) as ApiResult<unknown>;
      if (!res.ok || !body.success) throw new Error(body.error ?? "Thao tác thất bại");
      setToast("Đã cập nhật trạng thái campaign");
      setTimeout(() => setToast(""), 1800);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Thao tác thất bại");
    } finally {
      setActing(false);
    }
  }

  async function saveEdit() {
    if (!item) return;
    setActing(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/campaigns/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: editForm.title,
          brief: editForm.brief,
          startsAt: editForm.startsAt ? new Date(editForm.startsAt).toISOString() : null,
          endsAt: editForm.endsAt ? new Date(editForm.endsAt).toISOString() : null,
          budgetVnd: Number(editForm.budgetVnd),
          targetAmountVnd: Number(editForm.targetAmountVnd),
          reason: "Cập nhật thông tin campaign từ admin"
        })
      });
      const body = (await res.json()) as ApiResult<unknown>;
      if (!res.ok || !body.success) throw new Error(body.error ?? "Cập nhật campaign thất bại");
      setToast("Đã cập nhật campaign");
      setTimeout(() => setToast(""), 1800);
      setEditing(false);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Cập nhật campaign thất bại");
    } finally {
      setActing(false);
    }
  }

  if (loading) {
    return (
      <>
        <PageHeader title="Chi tiết chiến dịch" subtitle="Đang tải dữ liệu..." />
        <LoadingSkeleton rows={6} />
      </>
    );
  }

  if (error || !item) {
    return <ErrorState title="Không tải được campaign detail" description={error || "Lỗi không xác định"} onRetry={() => void load()} />;
  }

  return (
    <>
      <PageHeader
        title={item.title}
        subtitle={`Brand: ${item.brand.displayName}`}
        action={
          <div className="flex gap-2">
            <button className="dc-btn-secondary" onClick={() => router.push(`/admin/campaigns/${item.id}/applications`)}>Applications</button>
            <button className="dc-btn-secondary" onClick={() => router.push(`/admin/campaigns/${item.id}/missions`)}>Quản lý mission/job</button>
            <button className="dc-btn-secondary" onClick={() => router.push("/admin/campaigns")}>Back</button>
          </div>
        }
      />
      {error ? <div className="mb-4"><ErrorState title="Có lỗi thao tác" description={error} onRetry={() => void load()} /></div> : null}

      <SectionCard title="Campaign status">
        <div className="flex items-center justify-between">
          <StatusBadge status={item.statusView.toLowerCase()} />
        </div>
        <div className="mt-3 grid gap-2 text-sm text-zinc-700">
          <p>Brief: {item.brief}</p>
          <p>Timeline: {item.startsAt ? new Date(item.startsAt).toLocaleString("vi-VN") : "Không có"} - {item.endsAt ? new Date(item.endsAt).toLocaleString("vi-VN") : "Không có"}</p>
          <p>Budget: {item.budgetVnd.toLocaleString("vi-VN")} VND</p>
          <p>KPI: Target {item.kpiSnapshot.targetAmountVnd.toLocaleString("vi-VN")} / Funded {item.kpiSnapshot.fundedAmountVnd.toLocaleString("vi-VN")} / Backers {item.kpiSnapshot.backerCount}</p>
          <p>Commission: {item.commission.commissionRatePercent ?? "Không có"}% • Revenue share: {item.commission.revenueSharePercent ?? "Không có"}%</p>
          <p>Quota Creator/User: {item.quota.creator} / {item.quota.user}</p>
          <p>Brand approved: {item.brandProfile?.status === "ACTIVE" ? "Có" : "Không"}</p>
        </div>
      </SectionCard>

      <section className="mt-4 dc-card p-4">
        <div className="mb-3 flex items-center justify-between">
          <p className="font-semibold">Thông tin campaign</p>
          {!editing ? (
            <button className="dc-btn-secondary" onClick={() => setEditing(true)}>Chỉnh sửa</button>
          ) : (
            <div className="flex gap-2">
              <button className="dc-btn-secondary" onClick={() => setEditing(false)} disabled={acting}>Hủy</button>
              <button className="dc-btn-primary" onClick={() => void saveEdit()} disabled={acting}>Lưu</button>
            </div>
          )}
        </div>
        {editing ? (
          <div className="grid gap-3 md:grid-cols-2">
            <label className="grid gap-1 text-sm">
              <span className="font-semibold">Tên campaign</span>
              <input className="dc-input" value={editForm.title} onChange={(e) => setEditForm((s) => ({ ...s, title: e.target.value }))} />
            </label>
            <label className="grid gap-1 text-sm">
              <span className="font-semibold">Budget (VND)</span>
              <input className="dc-input" type="number" min={1} value={editForm.budgetVnd} onChange={(e) => setEditForm((s) => ({ ...s, budgetVnd: Number(e.target.value || 0) }))} />
            </label>
            <label className="grid gap-1 text-sm md:col-span-2">
              <span className="font-semibold">Brief</span>
              <textarea className="dc-input min-h-24" value={editForm.brief} onChange={(e) => setEditForm((s) => ({ ...s, brief: e.target.value }))} />
            </label>
            <label className="grid gap-1 text-sm">
              <span className="font-semibold">Starts at</span>
              <input className="dc-input" type="datetime-local" value={editForm.startsAt} onChange={(e) => setEditForm((s) => ({ ...s, startsAt: e.target.value }))} />
            </label>
            <label className="grid gap-1 text-sm">
              <span className="font-semibold">Ends at</span>
              <input className="dc-input" type="datetime-local" value={editForm.endsAt} onChange={(e) => setEditForm((s) => ({ ...s, endsAt: e.target.value }))} />
            </label>
            <label className="grid gap-1 text-sm">
              <span className="font-semibold">Target amount (VND)</span>
              <input className="dc-input" type="number" min={1} value={editForm.targetAmountVnd} onChange={(e) => setEditForm((s) => ({ ...s, targetAmountVnd: Number(e.target.value || 0) }))} />
            </label>
          </div>
        ) : (
          <p className="text-sm text-zinc-600">Dùng nút Chỉnh sửa để cập nhật title, brief, timeline, budget và target.</p>
        )}
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

      <section className="mt-4">
        <SectionCard title="Quyết định">
        <div className="mt-3 flex flex-wrap gap-2">
          <button className="dc-btn-primary" disabled={acting} onClick={() => void act("approve")}>Approve & Publish</button>
          <button className="dc-btn-secondary" disabled={acting} onClick={() => setConfirmAction("request-changes")}>Request changes</button>
          <button className="dc-btn-secondary" disabled={acting} onClick={() => setConfirmAction("pause")}>Pause</button>
          <button className="dc-btn-secondary" disabled={acting} onClick={() => setConfirmAction("reject")}>Reject</button>
        </div>
        </SectionCard>
      </section>

      {toast ? <ActionToast message={toast} /> : null}
      <ReviewActionDialog
        open={confirmAction === "pause"}
        title="Pause campaign?"
        description="Campaign sẽ tạm dừng hiển thị và vận hành."
        confirmLabel="Pause campaign"
        requireReason
        reasonPlaceholder="Nêu rõ lý do tạm dừng campaign..."
        submitting={acting}
        onCancel={() => !acting && setConfirmAction(null)}
        onConfirm={(reason) => {
          setConfirmAction(null);
          void act("pause", reason);
        }}
      />
      <ReviewActionDialog
        open={confirmAction === "reject"}
        title="Reject campaign?"
        description="Campaign sẽ bị từ chối và cần tạo/chỉnh lại theo policy."
        confirmLabel="Reject campaign"
        requireReason
        reasonPlaceholder="Nêu rõ lý do từ chối campaign..."
        submitting={acting}
        onCancel={() => !acting && setConfirmAction(null)}
        onConfirm={(reason) => {
          setConfirmAction(null);
          void act("reject", reason);
        }}
      />
      <ReviewActionDialog
        open={confirmAction === "request-changes"}
        title="Request campaign changes?"
        description="Campaign sẽ được trả về trạng thái cần chỉnh sửa."
        confirmLabel="Yêu cầu chỉnh sửa"
        requireReason
        reasonPlaceholder="Nêu rõ nội dung cần Brand chỉnh sửa..."
        submitting={acting}
        onCancel={() => !acting && setConfirmAction(null)}
        onConfirm={(reason) => {
          setConfirmAction(null);
          void act("request-changes", reason);
        }}
      />
    </>
  );
}
