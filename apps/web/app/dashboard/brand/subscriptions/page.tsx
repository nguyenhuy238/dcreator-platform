"use client";

import { useCallback, useEffect, useState } from "react";
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

export default function BrandSubscriptionsPage() {
  const [data, setData] = useState<SubscriptionPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");
  const [buyingCode, setBuyingCode] = useState<BrandSubscriptionPackageCode | null>(null);

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
      setToast("Đã nâng cấp gói và trừ N-Point thành công");
      setTimeout(() => setToast(""), 1800);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Không thể nâng cấp gói");
    } finally {
      setBuyingCode(null);
    }
  }

  const currentPackage = data?.packages.find((item) => item.status === "ACTIVE");

  return (
    <>
      <PageHeader
        title="Mục tiêu gói đăng ký"
        subtitle="Gói Free không cần mua. Các gói UGC sẽ trừ trực tiếp N-Point trong ví Brand khi nâng cấp."
      />

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
                        <li key={feature}>• {feature}</li>
                      ))}
                    </ul>

                    {item.specialTitle ? (
                      <div className="mt-5 text-sm text-zinc-700">
                        <p className="font-semibold text-zinc-900">{item.specialTitle}:</p>
                        <p className="mt-2">{item.specialIntro}</p>
                        <ul className="mt-2 space-y-2">
                          {item.specialFeatures?.map((feature) => (
                            <li key={feature}>• {feature}</li>
                          ))}
                        </ul>
                      </div>
                    ) : null}

                    <button
                      type="button"
                      disabled={disabled}
                      onClick={() => void purchasePackage(item.code)}
                      className="mt-5 rounded-xl bg-zinc-900 px-4 py-2.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
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

      {toast ? <ActionToast message={toast} /> : null}
    </>
  );
}
