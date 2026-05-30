"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type Onboarding = {
  completed: boolean;
  legalName: string;
  industry: string;
  taxCode: string;
  productCategories: string;
  inventoryDescription: string;
  revenueSharePercent: number;
  commissionRatePercent: number;
  bccAgreementVersion: string;
  legalResponsibilityAccepted: boolean;
  contractSignedAt: string | null;
};

type ApiResponse<T> = { success: true; data: T } | { success: false; error: string };

export function BrandOnboardingCard() {
  const [data, setData] = useState<Onboarding | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    fetch("/api/brand/dashboard/onboarding", { cache: "no-store" })
      .then(async (response) => {
        const payload = (await response.json()) as ApiResponse<Onboarding>;
        if (!active) return;
        if (!response.ok || !payload.success) {
          setError(payload.success ? "Không thể tải onboarding" : payload.error);
          return;
        }
        setData(payload.data);
      })
      .catch((requestError: Error) => {
        if (active) setError(requestError.message);
      });
    return () => {
      active = false;
    };
  }, []);

  if (error) {
    return <div className="dc-card border-red-200 bg-red-50 p-5 text-sm text-red-700">{error}</div>;
  }

  if (!data) {
    return <div className="h-28 animate-pulse rounded-2xl bg-zinc-100" />;
  }

  return (
    <section className={`dc-card p-5 ${data.completed ? "border-emerald-200 bg-emerald-50" : "border-amber-200 bg-amber-50"}`}>
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-zinc-500">Brand onboarding</p>
          <h2 className="mt-2 text-xl font-black text-zinc-900">{data.completed ? "BCC đã hoàn tất" : "Cần hoàn tất BCC"}</h2>
          <p className="mt-1 text-sm text-zinc-700">
            Bổ sung pháp lý và xác nhận BCC trước khi vận hành campaign chính thức.
          </p>
        </div>
        <Link href="/dashboard/brand/onboarding" className={data.completed ? "dc-btn-secondary" : "dc-btn-primary"}>
          {data.completed ? "Xem BCC" : "Hoàn tất BCC"}
        </Link>
      </div>
      <div className="mt-4 grid gap-2 text-sm text-zinc-700 md:grid-cols-3">
        <p>Pháp lý: {data.legalName && data.taxCode ? "OK" : "Thiếu"}</p>
        <p>BCC: {data.legalResponsibilityAccepted ? data.bccAgreementVersion : "Chưa xác nhận"}</p>
        <p>Commission: {data.commissionRatePercent}%</p>
      </div>
    </section>
  );
}
