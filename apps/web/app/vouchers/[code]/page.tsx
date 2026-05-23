"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AppShell, PublicHeader } from "@/app/components/dcreator/layout/shell";
import { EmptyState, ErrorState, PageHeader, StatusBadge } from "@/app/components/dcreator/ui/base";

type VoucherDetail = {
  id: string;
  voucherCode: string;
  status: string;
  expiryAt: string | null;
  reward: { title: string; campaign: { title: string } };
};

const nav = [
  { href: "/dashboard/user", label: "Tổng quan" },
  { href: "/campaigns", label: "Chiến dịch" },
  { href: "/wallet", label: "Ví" },
  { href: "/vouchers", label: "Voucher" }
];

export default function VoucherDetailPage({ params }: { params: { code: string } }) {
  const [voucher, setVoucher] = useState<VoucherDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [statusText, setStatusText] = useState("");

  useEffect(() => {
    (async () => {
      const response = await fetch(`/api/vouchers/${params.code}`, { cache: "no-store" });
      const body = await response.json();
      if (!response.ok || !body.success) {
        setError(body.error ?? "Tải voucher thất bại");
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
    <>
      <PublicHeader />
      <AppShell sidebarItems={nav}>
        <PageHeader title="Voucher Detail" subtitle="Thông tin mã voucher và trạng thái sử dụng." action={<Link href="/vouchers" className="dc-btn-secondary">Quay lại</Link>} />
        {error ? <ErrorState title="Không thể tải voucher" description={error} /> : null}
        {!error && !voucher ? <div className="h-40 animate-pulse rounded-3xl bg-zinc-100" /> : null}
        {voucher ? (
          <article className="dc-card max-w-xl p-5">
            <div className="flex items-center justify-between">
              <p className="font-mono text-xl font-bold tracking-wide">{voucher.voucherCode}</p>
              <StatusBadge status={voucher.status.toLowerCase()} />
            </div>
            <p className="mt-3 font-semibold">{voucher.reward.title}</p>
            <p className="mt-1 text-sm text-zinc-600">Campaign: {voucher.reward.campaign.title}</p>
            <p className="mt-1 text-sm text-zinc-600">Hạn dùng: {voucher.expiryAt ? new Date(voucher.expiryAt).toLocaleString("vi-VN") : "Không có"}</p>
            <div className="mt-4 flex items-center gap-2">
              <button type="button" onClick={redeem} className="dc-btn-primary" disabled={voucher.status === "USED" || voucher.status === "EXPIRED"}>
                Redeem
              </button>
              <Link href="/campaigns" className="dc-btn-secondary">Xem campaign</Link>
            </div>
            {statusText ? <p className="mt-3 text-sm text-zinc-700">{statusText}</p> : null}
          </article>
        ) : null}
        {!error && voucher && (voucher.status === "USED" || voucher.status === "EXPIRED") ? (
          <div className="mt-4 max-w-xl">
            <EmptyState title="Voucher không khả dụng" description="Voucher đã được sử dụng hoặc đã hết hạn." />
          </div>
        ) : null}
      </AppShell>
    </>
  );
}
