"use client";

import { useEffect, useState } from "react";

type Voucher = {
  id: string;
  voucherCode: string;
  status: "ISSUED" | "ACTIVE" | "USED" | "EXPIRED" | "CANCELLED";
  expiryAt: string | null;
  reward: { title: string; campaign: { title: string; slug: string } };
};

export default function MyVouchersPage() {
  const [items, setItems] = useState<Voucher[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/me/vouchers", { cache: "no-store" })
      .then((r) => r.json())
      .then((body) => {
        if (!body.success) throw new Error(body.error ?? "Load vouchers failed");
        setItems(body.data as Voucher[]);
      })
      .catch((e) => setError(e.message));
  }, []);

  return (
    <main className="container">
      <h1>My Vouchers</h1>
      {error ? <p className="error">{error}</p> : null}
      {items.map((item) => (
        <article key={item.id} className="card">
          <h3>{item.reward.title}</h3>
          <p>Campaign: {item.reward.campaign.title}</p>
          <p>Code: {item.voucherCode}</p>
          <p>Status: {item.status}</p>
          <p>Expiry: {item.expiryAt ? new Date(item.expiryAt).toLocaleString("vi-VN") : "N/A"}</p>
          <p>
            <a href={`/vouchers/${item.voucherCode}`}>Voucher detail</a>
          </p>
        </article>
      ))}
    </main>
  );
}
