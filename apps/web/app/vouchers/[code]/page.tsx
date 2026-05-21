"use client";

import { useEffect, useState } from "react";

type VoucherDetail = {
  id: string;
  voucherCode: string;
  status: string;
  expiryAt: string | null;
  reward: { title: string; campaign: { title: string } };
};

export default function VoucherDetailPage({ params }: { params: { code: string } }) {
  const [voucher, setVoucher] = useState<VoucherDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [statusText, setStatusText] = useState("");

  useEffect(() => {
    (async () => {
      const response = await fetch(`/api/vouchers/${params.code}`, { cache: "no-store" });
      const body = await response.json();
      if (!response.ok || !body.success) {
        setError(body.error ?? "Load voucher failed");
        return;
      }
      setVoucher(body.data);
    })();
  }, [params.code]);

  const redeem = async () => {
    if (!voucher) return;
    const response = await fetch(`/api/vouchers/${voucher.voucherCode}/redeem`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({})
    });
    const body = await response.json();
    if (!response.ok || !body.success) {
      setStatusText(body.error ?? "Redeem failed");
      return;
    }
    setVoucher(body.data);
    setStatusText("Redeem success");
  };

  return (
    <main className="container">
      <h1>Voucher detail</h1>
      {error ? <p className="error">{error}</p> : null}
      {!voucher ? null : (
        <article className="card">
          <h3>{voucher.reward.title}</h3>
          <p>Campaign: {voucher.reward.campaign.title}</p>
          <p>Code: {voucher.voucherCode}</p>
          <p>QR/Code: [{voucher.voucherCode}]</p>
          <p>Status: {voucher.status}</p>
          <p>Expiry: {voucher.expiryAt ? new Date(voucher.expiryAt).toLocaleString("vi-VN") : "N/A"}</p>
          <button type="button" onClick={redeem} disabled={voucher.status === "USED" || voucher.status === "EXPIRED"}>
            Redeem
          </button>
          <p>{statusText}</p>
        </article>
      )}
    </main>
  );
}
