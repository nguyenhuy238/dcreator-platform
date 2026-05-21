"use client";

import { FormEvent, useEffect, useState } from "react";

type AdminVoucher = {
  id: string;
  voucherCode: string;
  status: string;
  account: { displayName: string; email: string };
  reward: { title: string; campaign: { title: string } };
};

export default function AdminVouchersPage() {
  const [items, setItems] = useState<AdminVoucher[]>([]);
  const [logs, setLogs] = useState<Array<{ id: string; action: string; targetId: string; createdAt: string }>>([]);
  const [code, setCode] = useState("");
  const [user, setUser] = useState("");
  const [campaign, setCampaign] = useState("");
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    const query = new URLSearchParams({ code, user, campaign });
    const response = await fetch(`/api/admin/vouchers?${query.toString()}`, { cache: "no-store" });
    const body = await response.json();
    if (!response.ok || !body.success) throw new Error(body.error ?? "Load admin vouchers failed");
    setItems(body.data.items);
    setLogs(body.data.logs);
  };

  useEffect(() => {
    load().catch((e) => setError(e.message));
  }, []);

  const onSearch = async (event: FormEvent) => {
    event.preventDefault();
    try {
      await load();
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Search failed");
    }
  };

  const cancel = async (id: string) => {
    const response = await fetch(`/api/admin/vouchers/${id}/cancel`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ reason: "Fraud detected" })
    });
    const body = await response.json();
    if (!response.ok || !body.success) {
      setError(body.error ?? "Cancel failed");
      return;
    }
    await load();
  };

  return (
    <main className="container">
      <h1>Voucher management</h1>
      <form onSubmit={onSearch}>
        <label>
          Code
          <input value={code} onChange={(e) => setCode(e.target.value)} />
        </label>
        <label>
          User
          <input value={user} onChange={(e) => setUser(e.target.value)} />
        </label>
        <label>
          Campaign
          <input value={campaign} onChange={(e) => setCampaign(e.target.value)} />
        </label>
        <button type="submit">Search</button>
      </form>
      {error ? <p className="error">{error}</p> : null}
      {items.map((item) => (
        <article key={item.id} className="card">
          <p>{item.voucherCode}</p>
          <p>Status: {item.status}</p>
          <p>User: {item.account.displayName} ({item.account.email})</p>
          <p>Campaign: {item.reward.campaign.title}</p>
          <button type="button" onClick={() => cancel(item.id)} disabled={item.status === "USED"}>
            Cancel voucher
          </button>
        </article>
      ))}
      <section className="card">
        <h2>Redemption logs</h2>
        {logs.map((log) => (
          <p key={log.id}>
            {log.action} - {log.targetId} - {new Date(log.createdAt).toLocaleString("vi-VN")}
          </p>
        ))}
      </section>
    </main>
  );
}
