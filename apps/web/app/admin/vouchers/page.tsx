"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useState } from "react";
import { ActionToast, EmptyState, ErrorState, LoadingSkeleton, PageHeader, SectionHeader, StatusBadge } from "@/app/components/dcreator/ui/base";

type AdminVoucher = {
  id: string;
  voucherCode: string;
  status: string;
  account: { displayName: string; email: string };
  reward: { title: string; campaign: { title: string } };
};

function buildVoucherQuery(params: { code: string; user: string; campaign: string }) {
  const query = new URLSearchParams();
  const normalizedCode = params.code.trim();
  const normalizedUser = params.user.trim();
  const normalizedCampaign = params.campaign.trim();
  if (normalizedCode) query.set("code", normalizedCode);
  if (normalizedUser) query.set("user", normalizedUser);
  if (normalizedCampaign) query.set("campaign", normalizedCampaign);
  return query.toString();
}

export default function AdminVouchersPage() {
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<AdminVoucher[]>([]);
  const [logs, setLogs] = useState<Array<{ id: string; action: string; targetId: string; createdAt: string }>>([]);
  const [code, setCode] = useState("");
  const [user, setUser] = useState("");
  const [campaign, setCampaign] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const query = buildVoucherQuery({ code, user, campaign });
    try {
      const url = query ? `/api/admin/vouchers?${query}` : "/api/admin/vouchers";
      const response = await fetch(url, { cache: "no-store" });
      const body = await response.json();
      if (!response.ok || !body.success) throw new Error(body.error ?? "Load admin vouchers failed");
      setItems(body.data.items);
      setLogs(body.data.logs);
    } finally {
      setLoading(false);
    }
  }, [campaign, code, user]);

  useEffect(() => {
    load().catch((e) => setError(e.message));
  }, [load]);

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
    setToast("Đã hủy voucher");
    setTimeout(() => setToast(""), 2000);
    await load();
  };

  return (
    <>
      <PageHeader
        title="Voucher Management"
        subtitle="Tra cứu, giám sát trạng thái và hủy voucher khi cần."
        action={<Link className="dc-btn-secondary" href="/admin">Về dashboard</Link>}
      />
      <section className="dc-card p-4">
        <form onSubmit={onSearch} className="grid gap-3 md:grid-cols-4">
          <input className="dc-input" placeholder="Voucher code" value={code} onChange={(e) => setCode(e.target.value)} />
          <input className="dc-input" placeholder="User name" value={user} onChange={(e) => setUser(e.target.value)} />
          <input className="dc-input" placeholder="Campaign title" value={campaign} onChange={(e) => setCampaign(e.target.value)} />
          <button type="submit" className="dc-btn-primary">Search</button>
        </form>
      </section>
      {error ? <div className="mt-4"><ErrorState title="Không tải được voucher" description={error} onRetry={() => void load()} /></div> : null}
      {loading ? <div className="mt-4"><LoadingSkeleton rows={4} /></div> : null}
      {!loading && !error ? (
        <section className="mt-6">
          <SectionHeader title="Voucher list" subtitle={`Tổng ${items.length} voucher`} />
          {items.length === 0 ? (
            <EmptyState title="Không có voucher phù hợp" description="Thử thay đổi điều kiện tìm kiếm." />
          ) : (
            <div className="grid gap-3">
              {items.map((item) => (
                <article key={item.id} className="dc-card flex flex-wrap items-center justify-between gap-3 p-4">
                  <div>
                    <p className="font-semibold">{item.voucherCode}</p>
                    <p className="text-sm text-zinc-600">
                      User: {item.account.displayName} ({item.account.email})
                    </p>
                    <p className="text-sm text-zinc-600">Campaign: {item.reward.campaign.title}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <StatusBadge status={item.status.toLowerCase()} />
                    <button type="button" className="dc-btn-secondary" onClick={() => void cancel(item.id)} disabled={item.status === "USED" || item.status === "CANCELLED"}>
                      Cancel
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      ) : null}
      <section className="mt-8 dc-card p-4">
        <SectionHeader title="Redemption logs" subtitle="Nhật ký thao tác voucher gần nhất." />
        {logs.length === 0 ? (
          <p className="text-sm text-zinc-600">Chưa có log.</p>
        ) : (
          <div className="grid gap-2 text-sm text-zinc-700">
            {logs.map((log) => (
              <p key={log.id}>
                {log.action} - {log.targetId.slice(0, 8)}*** - {new Date(log.createdAt).toLocaleString("vi-VN")}
              </p>
            ))}
          </div>
        )}
      </section>
      {toast ? <ActionToast message={toast} /> : null}
    </>
  );
}
