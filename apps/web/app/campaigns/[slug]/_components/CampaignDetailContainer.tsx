"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { CampaignDetailDTO } from "@/lib/dto/campaign-detail";
import { BriefTab, HeroSection, OverviewTab } from "./CampaignDetailSections";
import { CampaignRegisterCard } from "./CampaignRegisterCard";

type Props = { slug: string };

type ApiResponse = {
  success: boolean;
  data?: CampaignDetailDTO;
  error?: string;
  code?: string;
};

export function CampaignDetailContainer({ slug }: Props) {
  const router = useRouter();
  const [data, setData] = useState<CampaignDetailDTO | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isNotFound, setIsNotFound] = useState(false);
  const [activeTab, setActiveTab] = useState<"overview" | "brief">("overview");

  useEffect(() => {
    let active = true;
    const run = async () => {
      setLoading(true);
      setError(null);
      setIsNotFound(false);
      try {
        const response = await fetch(`/api/campaigns/${slug}`, { cache: "no-store" });
        const body = (await response.json()) as ApiResponse;
        if (!active) return;

        if (!response.ok) {
          if (response.status === 404 || body.code === "CAMPAIGN_NOT_FOUND") {
            setIsNotFound(true);
            return;
          }
          throw new Error(body.error ?? "Tải chi tiết chiến dịch thất bại");
        }

        if (!body.success || !body.data) {
          throw new Error(body.error ?? "Unexpected response");
        }

        setData(body.data);
      } catch (err) {
        if (!active) return;
        setError(err instanceof Error ? err.message : "Cannot load campaign detail");
      } finally {
        if (active) setLoading(false);
      }
    };

    void run();
    return () => {
      active = false;
    };
  }, [slug]);

  if (loading) {
    return (
      <main className="container grid gap-4 py-6">
        <div className="h-36 animate-pulse rounded-3xl bg-zinc-100" />
        <div className="h-36 animate-pulse rounded-3xl bg-zinc-100" />
        <div className="h-36 animate-pulse rounded-3xl bg-zinc-100" />
      </main>
    );
  }

  if (isNotFound) {
    return (
      <main className="container">
        <div className="dc-card mt-8 p-6">
          <h1 className="text-2xl font-black text-zinc-900">Chiến dịch không tồn tại</h1>
          <p className="mt-2 text-sm text-zinc-600">Chiến dịch có thể chưa được public hoặc đã bị gỡ.</p>
        </div>
      </main>
    );
  }

  if (error || !data) {
    return (
      <main className="container">
        <div className="dc-card mt-8 border-red-200 bg-red-50 p-6">
          <h1 className="text-2xl font-black text-red-700">Lỗi tải campaign detail</h1>
          <p className="mt-2 text-sm text-red-600">{error ?? "Không thể tải dữ liệu."}</p>
        </div>
      </main>
    );
  }

  return (
    <main className="py-6">
      <div className="mx-auto grid w-full max-w-[1440px] gap-5">
        <div>
          <button
            type="button"
            onClick={() => router.back()}
            className="inline-flex items-center gap-2 rounded-xl border border-zinc-200 bg-white px-4 py-2 text-sm font-semibold text-zinc-700 transition-colors hover:bg-zinc-50 hover:text-zinc-900"
          >
            <span aria-hidden="true">←</span>
            Quay lại
          </button>
        </div>
        <HeroSection
          data={data}
          applyCard={
            <CampaignRegisterCard data={data} dark />
          }
        />
        <section className="sticky top-16 z-10 border-y border-zinc-200 bg-white/95 backdrop-blur">
          <div className="mx-auto flex w-full max-w-[960px] items-center gap-1 py-2">
            <button
              type="button"
              onClick={() => setActiveTab("overview")}
              className={`rounded-xl px-4 py-2 text-sm font-bold uppercase tracking-wide ${activeTab === "overview" ? "bg-zinc-900 text-white" : "text-zinc-500"}`}
            >
              Tổng quan
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("brief")}
              className={`rounded-xl px-4 py-2 text-sm font-bold uppercase tracking-wide ${activeTab === "brief" ? "bg-zinc-900 text-white" : "text-zinc-500"}`}
            >
              Yêu cầu & brief
            </button>
          </div>
        </section>
        <section id="apply-mobile" className="lg:hidden"><CampaignRegisterCard data={data} /></section>
        <div className="mx-auto w-full max-w-[1180px]">{activeTab === "overview" ? <OverviewTab data={data} /> : <BriefTab data={data} />}</div>
      </div>
    </main>
  );
}
