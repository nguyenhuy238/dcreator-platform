"use client";

import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { ActionToast, ConfirmDialog, ErrorState, LoadingSkeleton, PageHeader, SectionCard, StatusBadge } from "@/app/components/dcreator/ui/base";

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
    creatorProfile: { bankName: string | null; bankAccountName: string | null; bankAccountNumber: string | null } | null;
  };
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
  const [reason, setReason] = useState("");
  const [confirmAction, setConfirmAction] = useState<null | "approve" | "mark-paid" | "reject">(null);
  const [item, setItem] = useState<Detail | null>(null);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/payouts/${id}`, { cache: "no-store" });
      const body = (await res.json()) as ApiResult<Detail>;
      if (!res.ok || !body.success) throw new Error(body.error ?? "Load detail failed");
      setItem(body.data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Load detail failed");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  async function act(action: "approve" | "reject" | "mark-paid") {
    if (!item) return;
    if (action === "reject" && !reason.trim()) {
      setError("Reject reason is required.");
      return;
    }
    setActing(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/payouts/${item.id}/${action}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: action === "reject" ? JSON.stringify({ reason: reason.trim() }) : JSON.stringify({})
      });
      const body = (await res.json()) as ApiResult<unknown>;
      if (!res.ok || !body.success) throw new Error(body.error ?? "Action failed");
      setToast("Đã cập nhật payout request");
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
        <PageHeader title="Payout Detail" subtitle="Đang tải dữ liệu..." />
        <LoadingSkeleton rows={5} />
      </>
    );
  }
  if (error || !item) {
    return <ErrorState title="Không tải được payout detail" description={error || "Unknown error"} onRetry={() => void load()} />;
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
          <p>Bank: {item.account.creatorProfile?.bankName ?? "N/A"} • {item.account.creatorProfile?.bankAccountName ?? "N/A"} • {item.account.creatorProfile?.bankAccountNumber ?? "N/A"}</p>
          <p>Note: {item.note ?? "N/A"}</p>
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
        <SectionCard title="Decision">
        <textarea className="dc-input mt-3 min-h-24" placeholder="Reject reason..." value={reason} onChange={(e) => setReason(e.target.value)} />
        <div className="mt-3 flex flex-wrap gap-2">
          <button className="dc-btn-primary" disabled={acting} onClick={() => setConfirmAction("approve")}>Approve</button>
          <button className="dc-btn-secondary" disabled={acting} onClick={() => setConfirmAction("reject")}>Reject</button>
          <button className="dc-btn-secondary" disabled={acting} onClick={() => setConfirmAction("mark-paid")}>Mark as paid</button>
        </div>
        </SectionCard>
      </section>
      {toast ? <ActionToast message={toast} /> : null}
      <ConfirmDialog
        open={confirmAction === "approve"}
        title="Approve payout request?"
        message="Hành động này xác nhận payout đã qua bước review."
        confirmLabel="Approve payout"
        tone="primary"
        onCancel={() => setConfirmAction(null)}
        onConfirm={() => {
          setConfirmAction(null);
          void act("approve");
        }}
      />
      <ConfirmDialog
        open={confirmAction === "mark-paid"}
        title="Mark payout as paid?"
        message="Xác nhận rằng khoản payout đã được chuyển tiền thực tế."
        confirmLabel="Mark paid"
        tone="danger"
        onCancel={() => setConfirmAction(null)}
        onConfirm={() => {
          setConfirmAction(null);
          void act("mark-paid");
        }}
      />
      <ConfirmDialog
        open={confirmAction === "reject"}
        title="Reject payout request?"
        message="Yêu cầu này sẽ bị từ chối và hoàn tiền về ví commission của creator."
        confirmLabel="Reject payout"
        tone="danger"
        onCancel={() => setConfirmAction(null)}
        onConfirm={() => {
          setConfirmAction(null);
          void act("reject");
        }}
      />
    </>
  );
}

