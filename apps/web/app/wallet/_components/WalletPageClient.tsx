"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { AppShell, PublicHeader } from "@/app/components/dcreator/layout/shell";
import { EmptyState, ErrorState, PageHeader, SectionHeader, StatsCard, StatusBadge } from "@/app/components/dcreator/ui/base";

type WalletResponse = {
  success: boolean;
  data?: {
    wallet: { pointsBalance: number; cashBalanceVnd: number };
    transactions: Array<{
      id: string;
      type: string;
      pointsDelta: number;
      cashDeltaVnd: number;
      createdAt: string;
      referenceType: string | null;
    }>;
    pendingPayments: Array<{ id: string; orderCode: string; requestedAmountVnd: number; status: string }>;
    payouts: Array<{ id: string; amountVnd: number; status: string; createdAt: string }>;
  };
  error?: string;
};

const nav = [
  { href: "/dashboard/user", label: "Tổng quan" },
  { href: "/campaigns", label: "Chiến dịch" },
  { href: "/wallet", label: "Ví" },
  { href: "/vouchers", label: "Voucher" }
];

function formatVnd(value: number) {
  return `${value.toLocaleString("vi-VN")} VND`;
}

function statusTone(text: string) {
  if (text.toLowerCase().includes("thành công") || text.toLowerCase().includes("success")) return "text-emerald-700";
  if (text.toLowerCase().includes("thất bại") || text.toLowerCase().includes("failed") || text.toLowerCase().includes("lỗi")) return "text-red-700";
  return "text-amber-700";
}

function onlyDigits(raw: string) {
  return raw.replace(/\D/g, "");
}

function parseNonNegativeInt(raw: string) {
  const digits = onlyDigits(raw);
  if (!digits) return 0;
  return Number.parseInt(digits, 10);
}

function formatIntForInput(value: number) {
  if (!Number.isFinite(value) || value <= 0) return "";
  return value.toLocaleString("vi-VN");
}

export function WalletPageClient() {
  const [data, setData] = useState<WalletResponse["data"] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [statusText, setStatusText] = useState("");
  const [amountVnd, setAmountVnd] = useState(100000);
  const [idempotencyKey, setIdempotencyKey] = useState(`topup-${Date.now()}`);

  const load = async () => {
    setError(null);
    const response = await fetch("/api/wallet/me", { cache: "no-store" });
    const body = (await response.json()) as WalletResponse;
    if (!response.ok || !body.success || !body.data) {
      throw new Error(body.error ?? "Không tải được ví");
    }
    setData(body.data);
  };

  useEffect(() => {
    load().catch((loadError) => setError(loadError instanceof Error ? loadError.message : "Không tải được ví"));
  }, []);

  const handleTopup = async (event: FormEvent) => {
    event.preventDefault();
    setStatusText("Đang tạo payment...");
    try {
      const response = await fetch("/api/wallet/topup/create-payment", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ amountVnd, idempotencyKey })
      });
      const body = (await response.json()) as {
        success: boolean;
        data?: { paymentUrl: string; status: string };
        error?: string;
      };
      if (!response.ok || !body.success || !body.data) {
        throw new Error(body.error ?? "Tạo payment thất bại");
      }
      setStatusText(`Payment pending: ${body.data.status}`);
      setIdempotencyKey(`topup-${Date.now()}`);
      window.open(body.data.paymentUrl, "_blank", "noopener,noreferrer");
      await load();
    } catch (submitError) {
      setStatusText(submitError instanceof Error ? submitError.message : "Top-up thất bại");
    }
  };

  const handlePayoutRequest = async () => {
    setStatusText("Đang tạo payout request...");
    const response = await fetch("/api/creator/payout-request", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        amountVnd: 50000,
        note: "Rut hoa hong creator",
        idempotencyKey: `payout-${Date.now()}`
      })
    });
    const body = (await response.json()) as { success: boolean; error?: string };
    if (!response.ok || !body.success) {
      setStatusText(body.error ?? "Tạo payout request thất bại");
      return;
    }
    setStatusText("Tạo payout request thành công");
    await load();
  };

  const topupPointEstimate = useMemo(() => Math.floor(amountVnd / 100), [amountVnd]);

  return (
    <>
      <PublicHeader />
      <AppShell sidebarItems={nav}>
        <PageHeader title="Wallet / N-Points" subtitle="Quản lý số dư N-Points, hoa hồng creator và lịch sử giao dịch." />

        {error ? <ErrorState title="Không thể tải dữ liệu ví" description={error} onRetry={() => void load()} /> : null}

        {!data && !error ? <div className="h-56 animate-pulse rounded-3xl bg-zinc-100" /> : null}

        {data ? (
          <>
            <section className="dc-grid-dashboard">
              <StatsCard title="Số dư N-Points" value={`${data.wallet.pointsBalance.toLocaleString("vi-VN")} điểm`} />
              <StatsCard title="Ví hoa hồng" value={formatVnd(data.wallet.cashBalanceVnd)} />
              <StatsCard title="Thanh toán chờ xác nhận" value={`${data.pendingPayments.length}`} />
              <StatsCard title="Yêu cầu payout" value={`${data.payouts.length}`} />
            </section>

            <section className="mt-8 grid gap-4 lg:grid-cols-[1.2fr_1fr]">
              <article className="dc-card p-5">
                <SectionHeader title="Nạp tiền" subtitle="Tạo giao dịch nạp tiền qua PayOS" />
                <form onSubmit={handleTopup} className="grid gap-3">
                  <label className="grid gap-1 text-sm font-medium text-zinc-700">
                    <span>Số tiền nạp (VND)</span>
                    <input
                      className="dc-input"
                      type="text"
                      inputMode="numeric"
                      placeholder="1.000"
                      value={formatIntForInput(amountVnd)}
                      onChange={(event) => setAmountVnd(parseNonNegativeInt(event.target.value))}
                    />
                    <span className="text-xs text-zinc-500">Đơn vị: VND, tối thiểu 1.000 VND.</span>
                  </label>
                  <label className="grid gap-1 text-sm font-medium text-zinc-700">
                    <span>Idempotency key</span>
                    <input className="dc-input" value={idempotencyKey} onChange={(event) => setIdempotencyKey(event.target.value)} />
                  </label>
                  <p className="text-sm text-zinc-600">Ước tính nhận: {topupPointEstimate.toLocaleString("vi-VN")} N-Points</p>
                  <div className="flex flex-wrap gap-2">
                    <button type="submit" className="dc-btn-primary">Nạp quỹ</button>
                    <button type="button" className="dc-btn-secondary" onClick={handlePayoutRequest}>Tạo payout request 50,000 VND</button>
                  </div>
                </form>
                <p className={`mt-3 text-sm font-medium ${statusText ? statusTone(statusText) : "text-zinc-500"}`}>
                  {statusText || "Trạng thái thanh toán sẽ hiển thị tại đây."}
                </p>
              </article>

              <article className="dc-card p-5">
                <SectionHeader title="Thanh toán chờ xác nhận" subtitle="Các giao dịch nạp đang chờ xác nhận" />
                {data.pendingPayments.length === 0 ? (
                  <EmptyState title="Không có giao dịch pending" description="Sau khi tạo payment, trạng thái đang chờ sẽ xuất hiện ở đây." />
                ) : (
                  <div className="grid gap-3">
                    {data.pendingPayments.map((payment) => (
                      <div key={payment.id} className="rounded-2xl border border-zinc-200 p-3">
                        <p className="font-semibold text-zinc-900">{payment.orderCode}</p>
                        <p className="text-sm text-zinc-600">{formatVnd(payment.requestedAmountVnd)}</p>
                        <div className="mt-2"><StatusBadge status={payment.status.toLowerCase()} /></div>
                      </div>
                    ))}
                  </div>
                )}
              </article>
            </section>

            <section className="mt-8">
              <SectionHeader title="Lịch sử giao dịch" subtitle="20 giao dịch gần nhất" />
              {data.transactions.length === 0 ? (
                <EmptyState title="Chưa có giao dịch" description="Lịch sử giao dịch sẽ xuất hiện khi bạn nạp tiền hoặc sử dụng điểm." />
              ) : (
                <div className="grid gap-3">
                  {data.transactions.map((transaction) => (
                    <article key={transaction.id} className="dc-card p-4">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="font-semibold text-zinc-900">{transaction.type}</p>
                        <p className="text-xs text-zinc-500">{new Date(transaction.createdAt).toLocaleString("vi-VN")}</p>
                      </div>
                      <div className="mt-2 grid gap-1 text-sm text-zinc-600 sm:grid-cols-3">
                        <p>Points: {transaction.pointsDelta > 0 ? "+" : ""}{transaction.pointsDelta.toLocaleString("vi-VN")}</p>
                        <p>Cash: {transaction.cashDeltaVnd > 0 ? "+" : ""}{formatVnd(transaction.cashDeltaVnd)}</p>
                        <p>Ref: {transaction.referenceType ?? "Không có"}</p>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </section>
          </>
        ) : null}
      </AppShell>
    </>
  );
}
