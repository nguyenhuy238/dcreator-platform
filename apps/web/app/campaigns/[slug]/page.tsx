"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { PublicHeader } from "@/app/components/dcreator/layout/shell";
import { CampaignProgress, RewardCard } from "@/app/components/dcreator/cards/campaign";
import { EmptyState, ErrorState, LoadingSkeleton, StatusBadge } from "@/app/components/dcreator/ui/base";
import { SupportModal } from "./_components/SupportModal";

type CampaignDetail = {
  id: string;
  title: string;
  description: string;
  shortDescription?: string;
  coverImageUrl?: string;
  status: string;
  category?: string;
  fundedAmountVnd: number;
  targetAmountVnd: number;
  rewards: Array<{ id: string; title: string; description?: string; pricePoints: number; priceVnd: number | null; stockTotal: number; stockClaimed: number; isOutOfStock: boolean }>;
};

export default function CampaignDetailPage() {
  const params = useParams<{ slug: string }>();
  const slug = params.slug;
  const [data, setData] = useState<CampaignDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [openModal, setOpenModal] = useState(false);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    fetch(`/api/campaigns/${slug}`)
      .then(async (res) => {
        const payload = await res.json();
        if (!res.ok || !payload.success) throw new Error(payload.error ?? "Không thể tải campaign");
        if (mounted) setData(payload.data as CampaignDetail);
      })
      .catch((err) => mounted && setError(err instanceof Error ? err.message : "Load error"))
      .finally(() => mounted && setLoading(false));
    return () => { mounted = false; };
  }, [slug]);

  return <><PublicHeader /><main className="mx-auto w-full max-w-7xl px-4 pb-20 pt-6 md:px-6">{loading ? <LoadingSkeleton rows={5} /> : null}{!loading && error ? <ErrorState title="Không thể tải campaign" description={error} /> : null}{!loading && !error && !data ? <EmptyState title="Không tìm thấy campaign" description="Campaign có thể đã kết thúc hoặc bị gỡ." /> : null}{data ? <><section className="dc-card overflow-hidden"><img src={data.coverImageUrl || "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=1400&q=80"} alt={data.title} className="h-56 w-full object-cover md:h-80" /><div className="p-5 md:p-8"><div className="mb-3 flex items-center gap-2"><StatusBadge status={data.status?.toLowerCase?.() ?? "active"} /><span className="rounded-full border border-zinc-200 bg-zinc-50 px-2.5 py-1 text-xs font-semibold">{data.category || "General"}</span></div><h1 className="text-3xl font-black tracking-tight">{data.title}</h1><p className="mt-2 text-zinc-600">{data.shortDescription || data.description}</p><div className="mt-4"><CampaignProgress fundedAmount={data.fundedAmountVnd} targetAmount={data.targetAmountVnd} /></div><button className="dc-btn-primary mt-5" onClick={() => setOpenModal(true)}>Ủng hộ ngay</button></div></section><section id="rewards" className="mt-8"><h2 className="text-2xl font-black">Reward tiers</h2><div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">{data.rewards.map((reward) => <RewardCard key={reward.id} title={reward.title} description={reward.description || "Reward campaign"} price={`${reward.pricePoints} N-Points`} stock={Math.max(0, reward.stockTotal - reward.stockClaimed)} benefits={["Voucher tự động", "Theo dõi lịch sử ủng hộ"]} eta="Sau xác nhận" />)}</div></section><SupportModal open={openModal} onClose={() => setOpenModal(false)} rewards={data.rewards.map((item) => ({ id: item.id, title: item.title, pricePoints: item.pricePoints, priceVnd: item.priceVnd, isOutOfStock: item.isOutOfStock }))} /></> : null}</main></>;
}
