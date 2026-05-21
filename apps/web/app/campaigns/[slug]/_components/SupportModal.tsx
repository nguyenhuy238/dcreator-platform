"use client";

import { useMemo, useState } from "react";
import type { CampaignDetailDTO } from "@/lib/dto/campaign-detail";

type Props = {
  open: boolean;
  onClose: () => void;
  campaignId: string;
  rewards: CampaignDetailDTO["rewards"];
  initialRewardId: string | null;
};

type Step = "select" | "confirm" | "loading" | "success" | "fail";

export function SupportModal({ open, onClose, campaignId, rewards, initialRewardId }: Props) {
  const [step, setStep] = useState<Step>("select");
  const [paymentMethod, setPaymentMethod] = useState<"N_POINTS" | "PAYOS">("N_POINTS");
  const [rewardId, setRewardId] = useState<string>(initialRewardId ?? rewards[0]?.id ?? "");
  const [result, setResult] = useState<{ voucher?: string; paymentUrl?: string; error?: string } | null>(null);

  const selectedReward = useMemo(() => rewards.find((reward) => reward.id === rewardId) ?? null, [rewards, rewardId]);

  if (!open) return null;

  const submit = async () => {
    if (!selectedReward) return;
    setStep("loading");
    setResult(null);
    try {
      const response = await fetch(`/api/campaigns/${campaignId}/contributions`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          rewardId: selectedReward.id,
          paymentMethod,
          amount: selectedReward.priceVnd ?? selectedReward.pricePoints * 100,
          idempotencyKey: `support-${campaignId}-${selectedReward.id}-${Date.now()}`
        })
      });
      const body = (await response.json()) as {
        success: boolean;
        data?: { status: "PENDING" | "SUCCESS" | "FAILED"; voucher: { code: string } | null; paymentUrl: string | null };
        error?: string;
      };
      if (!response.ok || !body.success || !body.data) throw new Error(body.error ?? "Support failed");

      if (body.data.status === "SUCCESS") {
        setResult({ voucher: body.data.voucher?.code });
        setStep("success");
        return;
      }
      if (body.data.status === "PENDING") {
        setResult({ paymentUrl: body.data.paymentUrl ?? undefined });
        setStep("success");
        return;
      }
      setStep("fail");
      setResult({ error: "Payment failed" });
    } catch (error) {
      setStep("fail");
      setResult({ error: error instanceof Error ? error.message : "Support failed" });
    }
  };

  return (
    <div className="card" role="dialog" aria-modal>
      <h3>Ủng hộ</h3>

      {step === "select" && (
        <>
          <p>Chọn reward</p>
          <select value={rewardId} onChange={(event) => setRewardId(event.target.value)}>
            {rewards.map((reward) => (
              <option key={reward.id} value={reward.id} disabled={reward.isOutOfStock}>
                {reward.title} - {reward.pricePoints} points {reward.isOutOfStock ? "(Hết lượt)" : ""}
              </option>
            ))}
          </select>
          <p>Phương thức thanh toán</p>
          <label>
            <input
              type="radio"
              checked={paymentMethod === "N_POINTS"}
              onChange={() => setPaymentMethod("N_POINTS")}
            />
            N-Points
          </label>
          <label>
            <input type="radio" checked={paymentMethod === "PAYOS"} onChange={() => setPaymentMethod("PAYOS")} />
            PayOS
          </label>
          <button type="button" onClick={() => setStep("confirm")} disabled={!selectedReward}>
            Xác nhận ủng hộ
          </button>
        </>
      )}

      {step === "confirm" && selectedReward && (
        <>
          <p>Reward: {selectedReward.title}</p>
          <p>Thanh toán: {paymentMethod}</p>
          <button type="button" onClick={submit}>
            Xác nhận ủng hộ
          </button>
          <button type="button" onClick={() => setStep("select")}>
            Chọn reward
          </button>
        </>
      )}

      {step === "loading" && <p>Đang xử lý ủng hộ...</p>}

      {step === "success" && (
        <>
          <p>Ủng hộ thành công.</p>
          {result?.voucher ? <p>Voucher: {result.voucher}</p> : null}
          {result?.paymentUrl ? (
            <p>
              Thanh toán pending: <a href={result.paymentUrl}>Mở PayOS</a>
            </p>
          ) : null}
          <p>
            <a href="/wallet">Voucher của tôi</a>
          </p>
          <button type="button" onClick={onClose}>
            Đóng
          </button>
        </>
      )}

      {step === "fail" && (
        <>
          <p className="error">{result?.error ?? "Ủng hộ thất bại."}</p>
          <button type="button" onClick={() => setStep("select")}>
            Ủng hộ
          </button>
        </>
      )}
    </div>
  );
}
