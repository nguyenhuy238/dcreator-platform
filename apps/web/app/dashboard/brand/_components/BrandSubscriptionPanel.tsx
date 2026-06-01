"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Wallet, X } from "@phosphor-icons/react";
import { ActionToast, EmptyState, ErrorState, LoadingSkeleton, PageHeader, StatsCard } from "@/app/components/dcreator/ui/base";
import type { BrandSubscriptionPackageCode, BrandSubscriptionPackageDefinition } from "@/lib/constants/brand-subscription";

type ApiResponse<T> = { success: true; data: T } | { success: false; error: string };
type PackageStatus = "ACTIVE" | "AVAILABLE" | "LOCKED";

type PackageViewModel = BrandSubscriptionPackageDefinition & {
  status: PackageStatus;
  canPurchase: boolean;
};

type SubscriptionPayload = {
  brand: { id: string; name: string; ownerAccountId: string };
  walletPoints: number;
  currentPackageCode: BrandSubscriptionPackageCode;
  updatedAt: string;
  packages: PackageViewModel[];
};

type BrandSubscriptionPanelProps = {
  showHeader?: boolean;
};

const ADMIN_EMAIL = "dcreator6688@gmail.com";

function formatPoints(value: number) {
  return `${value.toLocaleString("vi-VN")} N-Point`;
}

function statusLabel(status: PackageStatus) {
  switch (status) {
    case "ACTIVE":
      return "Đang sử dụng";
    case "AVAILABLE":
      return "Có thể nâng cấp";
    case "LOCKED":
      return "Đã có gói cao hơn";
    default:
      return status;
  }
}

function statusStyle(status: PackageStatus) {
  switch (status) {
    case "ACTIVE":
      return "bg-emerald-50 text-emerald-700 border-emerald-200";
    case "AVAILABLE":
      return "bg-amber-50 text-amber-700 border-amber-200";
    case "LOCKED":
      return "bg-zinc-100 text-zinc-600 border-zinc-200";
    default:
      return "bg-zinc-100 text-zinc-600 border-zinc-200";
  }
}

function purchaseButtonLabel(item: PackageViewModel, buying: boolean) {
  if (buying) return "Đang xử lý...";
  if (item.pricePoints === 0) return "Gói mặc định";
  if (item.status === "ACTIVE") return "Đang sử dụng";
  if (item.status === "LOCKED") return "Đã có gói cao hơn";
  return "Nâng cấp bằng N-Point";
}

export function BrandSubscriptionPanel({ showHeader = true }: BrandSubscriptionPanelProps) {
  const [data, setData] = useState<SubscriptionPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");
  const [buyingCode, setBuyingCode] = useState<BrandSubscriptionPackageCode | null>(null);
  const [selectedPackage, setSelectedPackage] = useState<PackageViewModel | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/brand/dashboard/subscriptions", { cache: "no-store" });
      const payload = (await response.json()) as ApiResponse<SubscriptionPayload>;
      if (!response.ok || !payload.success) {
        throw new Error(payload.success ? "Không thể tải gói đăng ký" : payload.error);
      }
      setData(payload.data);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Không thể tải gói đăng ký");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function purchasePackage(packageCode: BrandSubscriptionPackageCode) {
    setBuyingCode(packageCode);
    setError("");
    try {
      const response = await fetch("/api/brand/dashboard/subscriptions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ packageCode })
      });
      const payload = (await response.json()) as ApiResponse<SubscriptionPayload>;
      if (!response.ok || !payload.success) {
        throw new Error(payload.success ? "Không thể nâng cấp gói" : payload.error);
      }
      setData(payload.data);
      setSelectedPackage(null);
      setToast("Đã nâng cấp gói và trừ N-Point thành công");
      setTimeout(() => setToast(""), 1800);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Không thể nâng cấp gói");
    } finally {
      setBuyingCode(null);
    }
  }

  async function copyAdminEmail() {
    try {
      await navigator.clipboard.writeText(ADMIN_EMAIL);
      setToast("Đã copy email admin");
    } catch {
      setToast("Không thể copy email admin");
    }
    setTimeout(() => setToast(""), 1800);
  }

  const currentPackage = data?.packages.find((item) => item.status === "ACTIVE");
  const hasEnoughPoints = selectedPackage && data ? data.walletPoints >= selectedPackage.pricePoints : false;

  return (
    <>
      {showHeader ? (
        <PageHeader
          title="Mục tiêu gói đăng ký"
          subtitle="Gói Free không cần mua. Các gói UGC sẽ trừ trực tiếp N-Point trong ví Brand khi nâng cấp."
        />
      ) : null}

      {error ? <ErrorState title="Không thể xử lý gói đăng ký" description={error} onRetry={() => void load()} /> : null}
      {loading ? <LoadingSkeleton rows={4} /> : null}

      {!loading && data ? (
        <>
          <section className="dc-grid-dashboard">
            <StatsCard title="Gói hiện tại của Brand" value={currentPackage?.name ?? "Gói Free"} />
            <StatsCard title="Số dư ví N-Point" value={formatPoints(data.walletPoints)} />
            <StatsCard title="Trạng thái" value={statusLabel(currentPackage?.status ?? "ACTIVE")} />
            <StatsCard title="Cập nhật gần nhất" value={new Date(data.updatedAt).toLocaleString("vi-VN")} />
          </section>

          {data.packages.length === 0 ? (
            <section className="mt-6">
              <EmptyState title="Chưa có gói nào" description="Danh sách gói sẽ hiển thị tại đây khi được cấu hình." />
            </section>
          ) : (
            <section className="mt-6 grid gap-4 md:grid-cols-3">
              {data.packages.map((item) => {
                const disabled = !item.canPurchase || buyingCode !== null;
                const buying = buyingCode === item.code;

                return (
                  <article key={item.code} className="dc-card flex h-full flex-col p-5">
                    <div className="flex items-start justify-between gap-2">
                      <h2 className="text-lg font-semibold text-zinc-900">{item.name}</h2>
                      <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${statusStyle(item.status)}`}>
                        {statusLabel(item.status)}
                      </span>
                    </div>

                    <p className="mt-1 text-2xl font-bold text-zinc-900">{formatPoints(item.pricePoints)}</p>
                    <p className="mt-3 text-sm text-zinc-600">{item.summary}</p>

                    <ul className="mt-4 space-y-2 text-sm text-zinc-700">
                      {item.features.map((feature) => (
                        <li key={feature}>{feature}</li>
                      ))}
                    </ul>

                    {item.specialTitle ? (
                      <div className="mt-5 text-sm text-zinc-700">
                        <p className="font-semibold text-zinc-900">{item.specialTitle}:</p>
                        <p className="mt-2">{item.specialIntro}</p>
                        <ul className="mt-2 space-y-2">
                          {item.specialFeatures?.map((feature) => (
                            <li key={feature}>{feature}</li>
                          ))}
                        </ul>
                      </div>
                    ) : null}

                    <button
                      type="button"
                      disabled={disabled}
                      onClick={() => setSelectedPackage(item)}
                      className="mt-auto rounded-xl bg-zinc-900 px-4 py-2.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {purchaseButtonLabel(item, buying)}
                    </button>
                  </article>
                );
              })}
            </section>
          )}
        </>
      ) : null}

      {selectedPackage && data ? (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/45 p-4"
          role="presentation"
          onClick={() => setSelectedPackage(null)}
        >
          <section
            aria-labelledby="subscription-purchase-title"
            aria-modal="true"
            className="w-full max-w-lg rounded-2xl border border-zinc-200 bg-white p-5 shadow-xl"
            role="dialog"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Nâng cấp gói</p>
                <h2 id="subscription-purchase-title" className="mt-1 text-xl font-bold text-zinc-900">{selectedPackage.name}</h2>
                <p className="mt-1 text-sm text-zinc-600">Chi phí: <strong className="text-zinc-900">{formatPoints(selectedPackage.pricePoints)}</strong></p>
              </div>
              <button
                type="button"
                aria-label="Đóng popup"
                className="rounded-lg p-2 text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-900"
                onClick={() => setSelectedPackage(null)}
              >
                <X aria-hidden="true" size={18} />
              </button>
            </div>

            <div className="mt-5 grid gap-3">
              <div className={`rounded-xl border p-4 ${hasEnoughPoints ? "border-emerald-200 bg-emerald-50" : "border-amber-200 bg-amber-50"}`}>
                <div className="flex items-start gap-3">
                  <Wallet aria-hidden="true" className={hasEnoughPoints ? "text-emerald-700" : "text-amber-700"} size={22} />
                  <div>
                    <p className="font-semibold text-zinc-900">Thanh toán bằng N-Point</p>
                    <p className="mt-1 text-sm text-zinc-600">Số dư hiện tại: {formatPoints(data.walletPoints)}</p>
                    {!hasEnoughPoints ? <p className="mt-1 text-sm font-medium text-amber-700">Số dư chưa đủ. Vui lòng nạp thêm N-Point trước khi nâng cấp.</p> : null}
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    type="button"
                    className="dc-btn-primary"
                    disabled={!hasEnoughPoints || buyingCode !== null}
                    onClick={() => void purchasePackage(selectedPackage.code)}
                  >
                    {buyingCode === selectedPackage.code ? "Đang xử lý..." : "Xác nhận thanh toán"}
                  </button>
                  <Link href="/dashboard/brand/wallet" className="dc-btn-secondary">Nạp ví N-Point</Link>
                </div>
              </div>

              <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4">
                <p className="text-sm text-zinc-700">
                  Email liên hệ admin:{" "}
                  <a href={`mailto:${ADMIN_EMAIL}`} className="font-medium text-zinc-900 underline underline-offset-2">
                    {ADMIN_EMAIL}
                  </a>
                </p>
                <button type="button" className="dc-btn-secondary mt-4" onClick={() => void copyAdminEmail()}>
                  Copy email
                </button>
              </div>
            </div>
          </section>
        </div>
      ) : null}

      {toast ? <ActionToast message={toast} /> : null}
    </>
  );
}
