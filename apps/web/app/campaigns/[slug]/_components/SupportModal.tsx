"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Reward = { id: string; title: string; pricePoints: number; priceVnd: number | null; isOutOfStock: boolean };

type ApiResponse = {
  success: boolean;
  data?: { contributionId: string; status: "PENDING" | "SUCCESS" | "FAILED"; paymentUrl: string | null };
  error?: string;
};

function toSupportAmount(reward: Reward | undefined) {
  if (!reward) return 1000;
  if (reward.priceVnd && reward.priceVnd >= 1000) return reward.priceVnd;
  return Math.max(1000, reward.pricePoints * 1000);
}

export function SupportModal({
  open,
  onClose,
  rewards,
  campaignSlug,
  initialRewardId
}: {
  open: boolean;
  onClose: () => void;
  rewards: Reward[];
  campaignId?: string;
  campaignSlug?: string;
  initialRewardId?: string | null;
}) {
  const [step, setStep] = useState(1);
  const [rewardId, setRewardId] = useState("");
  const [method, setMethod] = useState<"N_POINTS" | "PAYOS">("N_POINTS");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    const preferred = initialRewardId && rewards.some((reward) => reward.id === initialRewardId) ? initialRewardId : null;
    const fallback = rewards.find((reward) => !reward.isOutOfStock)?.id ?? rewards[0]?.id ?? "";
    setRewardId(preferred ?? fallback);
    setMethod("N_POINTS");
    setStep(1);
    setError(null);
  }, [open, initialRewardId, rewards]);

  if (!open) return null;

  const selected = rewards.find((reward) => reward.id === rewardId);

  async function confirmSupport() {
    if (!campaignSlug || !selected || selected.isOutOfStock) return;
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/campaigns/${campaignSlug}/contributions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rewardId: selected.id,
          paymentMethod: method,
          amount: toSupportAmount(selected),
          idempotencyKey: `support-${selected.id}-${Date.now()}`
        })
      });
      const body = (await response.json()) as ApiResponse;
      if (!response.ok || !body.success || !body.data) {
        throw new Error(body.error ?? "Khong the tao giao dich ung ho.");
      }
      if (body.data.paymentUrl) {
        window.location.href = body.data.paymentUrl;
        return;
      }
      setStep(4);
    } catch (err) {
      setError(err instanceof Error ? err.message : "He thong dang ban, vui long thu lai.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-zinc-900/45 p-4">
      <div role="dialog" aria-modal className="dc-card w-full max-w-lg p-5">
        <div className="mb-4 flex items-center justify-between"><h3 className="text-xl font-bold">Ủng hộ campaign</h3><button className="dc-btn-secondary" onClick={onClose}>Đóng</button></div>
        <p className="mb-4 text-sm text-zinc-500">Bước {step}/4</p>
        {error ? <p className="mb-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}

        {step === 1 ? <div className="space-y-3"><p className="text-sm font-semibold">Bước 1: Chọn reward</p><select className="dc-input" value={rewardId} onChange={(event) => setRewardId(event.target.value)}>{rewards.map((reward) => <option key={reward.id} value={reward.id} disabled={reward.isOutOfStock}>{reward.title} - {reward.pricePoints} points {reward.isOutOfStock ? "(Hết lượt)" : ""}</option>)}</select><button className="dc-btn-primary" onClick={() => setStep(2)} disabled={!rewardId || selected?.isOutOfStock}>Chọn reward</button></div> : null}
        {step === 2 ? <div className="space-y-3"><p className="text-sm font-semibold">Bước 2: Chọn phương thức thanh toán</p><label className="dc-card flex cursor-pointer items-center justify-between rounded-2xl p-3"><span>N-Points</span><input type="radio" checked={method === "N_POINTS"} onChange={() => setMethod("N_POINTS")} /></label><label className="dc-card flex cursor-pointer items-center justify-between rounded-2xl p-3"><span>PayOS</span><input type="radio" checked={method === "PAYOS"} onChange={() => setMethod("PAYOS")} /></label><button className="dc-btn-primary" onClick={() => setStep(3)}>Tiếp tục</button></div> : null}
        {step === 3 ? <div className="space-y-3"><p className="text-sm font-semibold">Bước 3: Xác nhận thông tin</p><p className="text-sm text-zinc-600">Reward: <span className="font-semibold text-zinc-900">{selected?.title}</span></p><p className="text-sm text-zinc-600">Thanh toán: <span className="font-semibold text-zinc-900">{method}</span></p><p className="text-sm text-zinc-600">Số tiền ghi nhận: <span className="font-semibold text-zinc-900">{toSupportAmount(selected).toLocaleString("vi-VN")} VND</span></p><button className="dc-btn-primary" disabled={loading || !campaignSlug} onClick={confirmSupport}>{loading ? "Đang xử lý..." : "Xác nhận ủng hộ"}</button></div> : null}
        {step === 4 ? <div className="space-y-3 text-center"><p className="text-3xl">✓</p><p className="text-lg font-bold text-emerald-700">Ủng hộ thành công</p><div className="flex justify-center gap-3"><Link href="/vouchers" className="dc-btn-primary">Nhận voucher</Link><button className="dc-btn-secondary" onClick={onClose}>Quay lại campaign</button></div></div> : null}
      </div>
    </div>
  );
}
