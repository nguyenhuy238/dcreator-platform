"use client";

import { useState } from "react";

type Reward = { id: string; title: string; pricePoints: number; priceVnd: number | null; isOutOfStock: boolean };

export function SupportModal({ open, onClose, rewards }: { open: boolean; onClose: () => void; rewards: Reward[]; campaignId?: string; initialRewardId?: string | null }) {
  const [step, setStep] = useState(1);
  const [rewardId, setRewardId] = useState(rewards[0]?.id ?? "");
  const [method, setMethod] = useState<"N_POINTS" | "PAYOS">("N_POINTS");
  const [loading, setLoading] = useState(false);

  if (!open) return null;

  const selected = rewards.find((reward) => reward.id === rewardId);

  async function confirmSupport() {
    setLoading(true);
    await new Promise((resolve) => setTimeout(resolve, 900));
    setLoading(false);
    setStep(4);
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-zinc-900/45 p-4">
      <div role="dialog" aria-modal className="dc-card w-full max-w-lg p-5">
        <div className="mb-4 flex items-center justify-between"><h3 className="text-xl font-bold">Ủng hộ campaign</h3><button className="dc-btn-secondary" onClick={onClose}>Đóng</button></div>
        <p className="mb-4 text-sm text-zinc-500">Bước {step}/4</p>

        {step === 1 ? <div className="space-y-3"><p className="text-sm font-semibold">Bước 1: Chọn reward</p><select className="dc-input" value={rewardId} onChange={(event) => setRewardId(event.target.value)}>{rewards.map((reward) => <option key={reward.id} value={reward.id} disabled={reward.isOutOfStock}>{reward.title} - {reward.pricePoints} points {reward.isOutOfStock ? "(Hết lượt)" : ""}</option>)}</select><button className="dc-btn-primary" onClick={() => setStep(2)}>Chọn reward</button></div> : null}
        {step === 2 ? <div className="space-y-3"><p className="text-sm font-semibold">Bước 2: Chọn phương thức thanh toán</p><label className="dc-card flex cursor-pointer items-center justify-between rounded-2xl p-3"><span>N-Points</span><input type="radio" checked={method === "N_POINTS"} onChange={() => setMethod("N_POINTS")} /></label><label className="dc-card flex cursor-pointer items-center justify-between rounded-2xl p-3"><span>PayOS</span><input type="radio" checked={method === "PAYOS"} onChange={() => setMethod("PAYOS")} /></label><button className="dc-btn-primary" onClick={() => setStep(3)}>Tiếp tục</button></div> : null}
        {step === 3 ? <div className="space-y-3"><p className="text-sm font-semibold">Bước 3: Xác nhận thông tin</p><p className="text-sm text-zinc-600">Reward: <span className="font-semibold text-zinc-900">{selected?.title}</span></p><p className="text-sm text-zinc-600">Thanh toán: <span className="font-semibold text-zinc-900">{method}</span></p><button className="dc-btn-primary" disabled={loading} onClick={confirmSupport}>{loading ? "Đang xử lý..." : "Xác nhận ủng hộ"}</button></div> : null}
        {step === 4 ? <div className="space-y-3 text-center"><p className="text-3xl">✓</p><p className="text-lg font-bold text-emerald-700">Ủng hộ thành công</p><div className="flex justify-center gap-3"><a href="/vouchers" className="dc-btn-primary">Xem voucher của tôi</a><button className="dc-btn-secondary" onClick={onClose}>Quay lại campaign</button></div></div> : null}
      </div>
    </div>
  );
}
