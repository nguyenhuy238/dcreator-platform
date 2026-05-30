"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { ActionToast, EmptyState, ErrorState, LoadingSkeleton, PageHeader, StatsCard } from "@/app/components/dcreator/ui/base";
import type { BrandSubscriptionPackageCode, BrandSubscriptionPackageDefinition } from "@/lib/constants/brand-subscription";

type ApiResponse<T> = { success: true; data: T } | { success: false; error: string };
type PackageStatus = "ACTIVE" | "AVAILABLE" | "LOCKED";

type PackageViewModel = BrandSubscriptionPackageDefinition & {
  videoQuota: number;
  status: PackageStatus;
  canPurchase: boolean;
};

type SubscriptionPayload = {
  brand: { id: string; name: string; ownerAccountId: string };
  walletPoints: number;
  currentPackageCode: BrandSubscriptionPackageCode;
  videoQuota: number;
  videoUsed: number;
  videoRemaining: number;
  isVideoQuotaReached: boolean;
  updatedAt: string;
  packages: PackageViewModel[];
};

type BrandSubscriptionPanelProps = {
  showHeader?: boolean;
};

const ADMIN_CONTACT_EMAIL = "dcreator6688@gmail.com";

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

function purchaseButtonLabel(item: PackageViewModel, buying: boolean, walletPoints: number) {
  if (buying) return "Đang xử lý...";
  if (item.pricePoints === 0) return "Gói mặc định";
  if (item.status === "ACTIVE") return "Đang sử dụng";
  if (item.status === "LOCKED") return "Đã có gói cao hơn";
  if (walletPoints < item.pricePoints) return "Không đủ N-Point";
  return "Nâng cấp bằng N-Point";
}

export function BrandSubscriptionPanel({ showHeader = true }: BrandSubscriptionPanelProps) {
  const [data, setData] = useState<SubscriptionPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");
  const [buyingCode, setBuyingCode] = useState<BrandSubscriptionPackageCode | null>(null);
  const [selectedPackage, setSelectedPackage] = useState<PackageViewModel | null>(null);
  const [showAdminContact, setShowAdminContact] = useState(false);

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

  function openPurchaseOptions(item: PackageViewModel) {
    if (!item.canPurchase || item.pricePoints === 0) return;
    setShowAdminContact(false);
    setSelectedPackage(item);
  }

  async function confirmPurchaseWithNPoint(item: PackageViewModel) {
    await purchasePackage(item.code);
    setSelectedPackage(null);
    setShowAdminContact(false);
  }

  async function copyAdminContact() {
    try {
      await navigator.clipboard.writeText(ADMIN_CONTACT_EMAIL);
      setToast("Đã copy email liên hệ admin");
      setTimeout(() => setToast(""), 1800);
    } catch {
      setToast(`Không thể copy tự động, vui lòng copy email ${ADMIN_CONTACT_EMAIL}`);
      setTimeout(() => setToast(""), 2200);
    }
  }

  const currentPackage = data?.packages.find((item) => item.status === "ACTIVE");
  const selectedCanAfford = data && selectedPackage ? data.walletPoints >= selectedPackage.pricePoints : false;
  const selectedMissingPoints = data && selectedPackage ? Math.max(selectedPackage.pricePoints - data.walletPoints, 0) : 0;

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
            <StatsCard title="Cơ chế gói" value="Theo sản phẩm / campaign" />
            <StatsCard title="Cập nhật gần nhất" value={new Date(data.updatedAt).toLocaleString("vi-VN")} />
          </section>

          {data.packages.length === 0 ? (
            <section className="mt-6">
              <EmptyState title="Chưa có gói nào" description="Danh sách gói sẽ hiển thị tại đây khi được cấu hình." />
            </section>
          ) : (
            <section className="mt-6 grid gap-4 md:grid-cols-3">
              {data.packages.map((item) => {
                const canAfford = data.walletPoints >= item.pricePoints;
                const disabled = !item.canPurchase || item.pricePoints === 0 || buyingCode !== null;
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
                    <p className="mt-1 text-xs font-semibold text-zinc-500">Áp dụng cho 1 sản phẩm / campaign</p>
                    <p className="mt-3 text-sm text-zinc-600">{item.summary}</p>


                    {item.canPurchase && !canAfford ? (
                      <p className="mt-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700">
                        Ví hiện có {formatPoints(data.walletPoints)}. Cần nạp thêm để nâng cấp gói này.
                      </p>
                    ) : null}

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
                      onClick={() => openPurchaseOptions(item)}
                      className="mt-auto rounded-xl bg-zinc-900 px-4 py-2.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {buying ? purchaseButtonLabel(item, buying, data.walletPoints) : "Chọn cách kích hoạt"}
                    </button>
                  </article>
                );
              })}
            </section>
          )}
        </>
      ) : null}

      {selectedPackage && data ? (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/45 p-4" onClick={() => setSelectedPackage(null)}>
          <div className="w-full max-w-lg rounded-2xl border border-zinc-200 bg-white p-5 shadow-xl" onClick={(event) => event.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="package-purchase-title">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-zinc-500">Kích hoạt gói</p>
                <h3 id="package-purchase-title" className="mt-1 text-xl font-bold text-zinc-900">{selectedPackage.name}</h3>
              </div>
              <button
                type="button"
                className="rounded-full px-3 py-1 text-xl leading-none text-zinc-500 hover:bg-zinc-100"
                onClick={() => {
                  setSelectedPackage(null);
                  setShowAdminContact(false);
                }}
                aria-label="Đóng popup"
              >
                x
              </button>
            </div>

            <div className="mt-4 rounded-2xl border border-zinc-100 bg-zinc-50 p-4">
              <p className="text-sm text-zinc-600">Giá gói</p>
              <p className="mt-1 text-2xl font-bold text-zinc-900">{formatPoints(selectedPackage.pricePoints)}</p>
              <p className="mt-2 text-sm text-zinc-600">Ví Brand hiện có {formatPoints(data.walletPoints)}.</p>
              {!selectedCanAfford ? (
                <p className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-700">
                  Cần nạp thêm {formatPoints(selectedMissingPoints)} để mua bằng N-Point.
                </p>
              ) : null}
            </div>

            <div className="mt-5 grid gap-3">
              <button
                type="button"
                onClick={() => setShowAdminContact((current) => !current)}
                className="rounded-xl border border-zinc-200 px-4 py-3 text-center text-sm font-semibold text-zinc-800 hover:bg-zinc-50"
              >
                Liên hệ admin để được tư vấn
              </button>
              {showAdminContact ? (
                <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4 text-sm text-zinc-700">
                  <p className="font-semibold text-zinc-900">Thông tin liên hệ admin</p>
                  <p className="mt-2">Email: <span className="font-semibold text-zinc-900">{ADMIN_CONTACT_EMAIL}</span></p>
                  <p className="mt-1">Nội dung: Tư vấn kích hoạt gói {selectedPackage.name}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button type="button" className="dc-btn-secondary" onClick={() => void copyAdminContact()}>
                      Copy email
                    </button>
                  </div>
                </div>
              ) : null}
              <button
                type="button"
                disabled={!selectedCanAfford || buyingCode !== null}
                onClick={() => void confirmPurchaseWithNPoint(selectedPackage)}
                className="rounded-xl bg-zinc-900 px-4 py-3 text-sm font-semibold text-white hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {buyingCode === selectedPackage.code ? "Đang xử lý..." : "Mua bằng N-Point"}
              </button>
              {!selectedCanAfford ? (
                <Link href="/dashboard/brand/wallet" className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-center text-sm font-semibold text-amber-700 hover:bg-amber-100" onClick={() => setSelectedPackage(null)}>
                  Nạp ví N-Point
                </Link>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}

      {toast ? <ActionToast message={toast} /> : null}
    </>
  );
}
