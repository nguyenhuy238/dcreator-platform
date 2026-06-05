"use client";

import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { ReviewActionDialog } from "@/app/admin/_components/ReviewActionDialog";
import { ActionToast, ErrorState, LoadingSkeleton, PageHeader, SectionCard, StatusBadge } from "@/app/components/dcreator/ui/base";

type ApiResult<T> = { success: boolean; data: T; error?: string };
type Detail = {
  id: string;
  amountVnd: number;
  status: string;
  note: string | null;
  createdAt: string;
  reviewedAt: string | null;
  paidAt: string | null;
  account: {
    id: string;
    displayName: string;
    email: string;
  };
  bankName: string;
  bankAccountName: string;
  bankAccountNumber: string;
  evidenceSubmissions: Array<{
    id: string;
    rewardGrantedAt: string | null;
    mission: { title: string; rewardCommissionVnd: number; campaign: { id: string; title: string } };
  }>;
};

export default function AdminPayoutDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = params?.id;
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");
  const [confirmAction, setConfirmAction] = useState<null | "approve" | "mark-paid" | "reject">(null);
  const [item, setItem] = useState<Detail | null>(null);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/payouts/${id}`, { cache: "no-store" });
      const body = (await res.json()) as ApiResult<Detail>;
      if (!res.ok || !body.success) throw new Error(body.error ?? "Tải chi tiết thất bại");
      setItem(body.data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Tải chi tiết thất bại");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  async function act(action: "approve" | "reject" | "mark-paid", reason?: string) {
    if (!item) return;
    setActing(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/payouts/${item.id}/${action}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: action === "reject" ? JSON.stringify({ reason: reason?.trim() }) : JSON.stringify({})
      });
      const body = (await res.json()) as ApiResult<unknown>;
      if (!res.ok || !body.success) throw new Error(body.error ?? "Thao tác thất bại");
      setToast("Đã cập nhật payout request");
      setTimeout(() => setToast(""), 1800);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Thao tác thất bại");
    } finally {
      setActing(false);
    }
  }

  if (loading) {
    return (
      <>
        <PageHeader title="Chi tiết rút thưởng" subtitle="Đang tải dữ liệu..." />
        <LoadingSkeleton rows={5} />
      </>
    );
  }
  if (error || !item) {
    return <ErrorState title="Không tải được payout detail" description={error || "Lỗi không xác định"} onRetry={() => void load()} />;
  }

  return (
    <>
      <PageHeader title={item.account.displayName} subtitle={`Payout: ${item.amountVnd.toLocaleString("vi-VN")} VND`} action={<button className="dc-btn-secondary" onClick={() => router.push("/admin/payouts")}>Back</button>} />
      {error ? <div className="mb-4"><ErrorState title="Có lỗi thao tác" description={error} onRetry={() => void load()} /></div> : null}
      <SectionCard title="Payout status">
        <div className="flex items-center justify-between">
          <StatusBadge status={item.status.toLowerCase()} />
        </div>
        <div className="mt-2 grid gap-2 text-sm text-zinc-700">
          <p>Creator: {item.account.displayName} • {item.account.email}</p>
          <p>Bank: {item.bankName} • {item.bankAccountName} • {item.bankAccountNumber}</p>
          <p>Note: {item.note ?? "Không có"}</p>
        </div>
      </SectionCard>
      <section className="mt-4">
        <SectionCard title="Evidence (credited submissions)">
        {item.evidenceSubmissions.length === 0 ? (
          <p className="mt-2 text-sm text-zinc-600">No evidence found from current model.</p>
        ) : (
          <div className="mt-2 grid gap-2">
            {item.evidenceSubmissions.map((s) => (
              <div key={s.id} className="rounded-2xl border border-zinc-200 p-3 text-sm">
                <p className="font-semibold">{s.mission.title}</p>
                <p className="text-zinc-600">Campaign: {s.mission.campaign.title}</p>
                <p className="text-zinc-600">Commission: {s.mission.rewardCommissionVnd.toLocaleString("vi-VN")} VND</p>
              </div>
            ))}
          </div>
        )}
        </SectionCard>
      </section>
      <section className="mt-4">
        <SectionCard title="Quyết định">
        <div className="mt-3 flex flex-wrap gap-2">
          <button className="dc-btn-primary" disabled={acting} onClick={() => setConfirmAction("approve")}>Approve</button>
          <button className="dc-btn-secondary" disabled={acting} onClick={() => setConfirmAction("reject")}>Reject</button>
          <button className="dc-btn-secondary" disabled={acting} onClick={() => setConfirmAction("mark-paid")}>Mark as paid</button>
        </div>
        </SectionCard>
      </section>
      {toast ? <ActionToast message={toast} /> : null}
      <ReviewActionDialog
        open={confirmAction === "approve"}
        title="Duyệt yêu cầu rút thưởng?"
        description="Hành động này xác nhận payout đã qua bước review."
        confirmLabel="Duyệt rút thưởng"
        submitting={acting}
        onCancel={() => setConfirmAction(null)}
        onConfirm={() => {
          setConfirmAction(null);
          void act("approve");
        }}
      />
      <ReviewActionDialog
        open={confirmAction === "mark-paid"}
        title="Đánh dấu đã thanh toán rút thưởng?"
        description="Xác nhận rằng khoản payout đã được chuyển tiền thực tế."
        confirmLabel="Đánh dấu đã thanh toán"
        submitting={acting}
        onCancel={() => setConfirmAction(null)}
        onConfirm={() => {
          setConfirmAction(null);
          void act("mark-paid");
        }}
      />
      <ReviewActionDialog
        open={confirmAction === "reject"}
        title="Từ chối yêu cầu rút thưởng?"
        description="Yêu cầu này sẽ bị từ chối và hoàn tiền về ví commission của creator."
        confirmLabel="Từ chối rút thưởng"
        requireReason
        reasonPlaceholder="Nhập lý do từ chối..."
        submitting={acting}
        onCancel={() => setConfirmAction(null)}
        onConfirm={(reason) => {
          setConfirmAction(null);
          void act("reject", reason);
        }}
      />
    </>
  );
}
