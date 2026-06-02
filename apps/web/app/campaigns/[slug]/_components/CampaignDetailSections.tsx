"use client";

import type { ReactNode } from "react";
import { CampaignCoverImage } from "@/app/components/dcreator/ui/CampaignCoverImage";
import type { CampaignDetailDTO } from "@/lib/dto/campaign-detail";
import { getCampaignTypeLabel } from "@/lib/constants/campaign-type";
import { CAMPAIGN_IMAGE_FALLBACK, resolveImageUrl } from "@/lib/images/resolve-image-url";
import { CampaignBriefRequirements } from "./CampaignBriefRequirements";
import { CampaignReviewProducts } from "./CampaignReviewProducts";
import { formatDateTime } from "./campaign-detail.utils";

const categoryLabel: Record<CampaignDetailDTO["hero"]["category"], string> = {
  TECH: "Công nghệ",
  FASHION: "Thời trang",
  FOOD: "Ẩm thực",
  BEAUTY: "Làm đẹp",
  LIFESTYLE: "Lối sống",
  EDUCATION: "Giáo dục"
};

const fallbackRoadmap = [
  "Đọc brief và đăng ký tham gia campaign.",
  "Brand/Admin xét duyệt creator phù hợp.",
  "Creator nhận yêu cầu nội dung và quay video review/seeding.",
  "Creator gửi video để Brand/Admin kiểm duyệt.",
  "Sau khi được duyệt, creator đăng video công khai theo đúng yêu cầu.",
  "Brand/Admin kiểm tra bài đăng và hoàn tất nghiệm thu."
];

function stripStepPrefix(step: string) {
  return step.replace(/^\s*(bước|step)\s*\d+\s*[:.)-]?\s*/i, "").trim();
}

function getAudienceLabel(value: CampaignDetailDTO["missions"][number]["audience"]) {
  return value === "CREATOR" ? "Nhà sáng tạo" : "Người dùng";
}

export function HeroSection({ data, applyCard }: { data: CampaignDetailDTO; applyCard: ReactNode }) {
  const coverMediaUrl = resolveImageUrl(data.hero.coverMediaUrl);
  const showVideo = data.hero.coverMediaType === "video" && coverMediaUrl !== CAMPAIGN_IMAGE_FALLBACK;

  return (
    <section className="relative min-h-[430px] overflow-hidden rounded-[32px] border border-zinc-200 bg-zinc-950 text-white shadow-xl md:min-h-[500px]">
      {showVideo ? (
        <video className="absolute inset-0 h-full w-full object-cover opacity-60" src={coverMediaUrl} autoPlay muted loop playsInline />
      ) : (
        <CampaignCoverImage src={coverMediaUrl} alt={data.hero.title} className="object-cover opacity-60" sizes="100vw" priority />
      )}
      <div className="absolute inset-0 bg-gradient-to-b from-black/35 via-black/45 to-black/95" />
      <div className="relative grid min-h-[430px] gap-8 p-5 md:min-h-[500px] md:p-8 lg:grid-cols-[minmax(0,1fr)_420px] lg:items-end">
        <div className="self-end">
          <span className="inline-flex rounded-full border border-emerald-200/40 bg-emerald-500/20 px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] text-emerald-100">{getCampaignTypeLabel()}</span>
          <h1 className="mt-4 max-w-4xl text-4xl font-black tracking-tight md:text-6xl">{data.hero.title}</h1>
          <p className="mt-3 text-base font-semibold text-zinc-100">Brand: {data.hero.brand}</p>
        </div>
        <div className="hidden lg:block">{applyCard}</div>
      </div>
    </section>
  );
}

function CampaignDealOverview({ data }: { data: CampaignDetailDTO }) {
  const mission = data.missions[0] ?? null;
  const cards = [
    { eyebrow: "QUYỀN LỢI", title: data.hero.benefits || "Nhận voucher/sản phẩm review Free", note: "Do Brand/Admin thiết lập", color: "from-emerald-50 to-teal-100" },
    { eyebrow: "YÊU CẦU", title: mission?.description || "01 Video + 01 Đánh giá sản phẩm", note: mission ? `Đối tượng: ${getAudienceLabel(mission.audience)}` : "Theo brief campaign", color: "from-sky-50 to-cyan-100" },
    { eyebrow: "THỜI HẠN", title: formatDateTime(mission?.deadline ?? data.hero.deadline), note: "Theo tiến độ campaign", color: "from-amber-50 to-orange-100" }
  ];
  return (
    <section>
      <h3 className="text-2xl font-black text-zinc-900">💎 Tổng Quan Deal</h3>
      <div className="mt-4 grid gap-4 md:grid-cols-3">
        {cards.map((card) => (
          <article key={card.eyebrow} className={`rounded-[28px] border border-white/70 bg-gradient-to-br ${card.color} p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-md`}>
            <p className="text-xs font-black tracking-[0.18em] text-zinc-500">{card.eyebrow}</p>
            <p className="mt-3 text-lg font-black text-zinc-900">{card.title}</p>
            <p className="mt-2 text-xs font-medium text-zinc-600">{card.note}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

function CampaignRewardGames() {
  return (
    <section>
      <h3 className="text-2xl font-black text-zinc-900">🎮 Trò chơi đổi thưởng</h3>
      <div className="mt-4 rounded-[28px] border border-dashed border-zinc-300 bg-gradient-to-br from-zinc-50 to-emerald-50 p-6 text-sm text-zinc-600">
        Chưa có trò chơi đổi thưởng cho campaign này.
      </div>
    </section>
  );
}

function CampaignInfoDarkSection({ data }: { data: CampaignDetailDTO }) {
  const mission = data.missions[0] ?? null;
  const rows = [
    ["Tên campaign", data.hero.title],
    ["Brand", data.hero.brand],
    ["Loại chiến dịch", getCampaignTypeLabel()],
    ["Ngành hàng", categoryLabel[data.hero.category]],
    ["Bắt đầu", formatDateTime(data.timeline.approvedAt ?? data.timeline.createdAt)],
    ["Kết thúc", formatDateTime(data.hero.deadline)],
    ["Trạng thái", data.hero.status],
    ["Mục tiêu campaign", data.hero.objective ?? "Đang cập nhật"],
    ["Điều kiện tham gia", mission ? getAudienceLabel(mission.audience) : "Đang cập nhật"]
  ];
  return (
    <section className="rounded-[32px] bg-zinc-950 p-5 text-white shadow-xl md:p-7">
      <h3 className="text-2xl font-black">Thông Tin Chiến Dịch</h3>
      <div className="mt-5 grid gap-x-8 gap-y-3 text-sm md:grid-cols-2">
        {rows.map(([label, value]) => <p key={label}><span className="text-zinc-400">{label}:</span> <span className="font-semibold text-zinc-100">{value}</span></p>)}
      </div>
      <div className="mt-5 border-t border-white/10 pt-5">
        <p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-300">Brief / mô tả</p>
        <p className="mt-2 max-w-4xl text-sm leading-6 text-zinc-300">{data.hero.description || "Đang cập nhật"}</p>
      </div>
    </section>
  );
}

function CampaignJoinTimeline({ data }: { data: CampaignDetailDTO }) {
  const roadmap = (data.hero.participationRoadmap.length > 0 ? data.hero.participationRoadmap : fallbackRoadmap).map(stripStepPrefix).filter(Boolean);
  return (
    <section>
      <h3 className="text-2xl font-black text-zinc-900">Lộ trình tham gia</h3>
      <ol className="mt-4 grid gap-3 lg:grid-cols-3">
        {roadmap.map((step, index) => (
          <li key={`${index}-${step}`} className="relative rounded-[24px] border border-zinc-200 bg-white p-4 shadow-sm transition hover:-translate-y-1 hover:shadow-md">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-zinc-900 text-sm font-black text-white">{index + 1}</span>
            <p className="mt-3 text-sm leading-6 text-zinc-700">{step}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}

export function OverviewTab({ data }: { data: CampaignDetailDTO }) {
  return (
    <section className="grid gap-8">
      <CampaignDealOverview data={data} />
      <CampaignReviewProducts data={data} />
      <CampaignRewardGames />
      <CampaignInfoDarkSection data={data} />
      <CampaignJoinTimeline data={data} />
    </section>
  );
}

export function BriefTab({ data }: { data: CampaignDetailDTO }) {
  return (
    <section className="grid gap-4">
      <CampaignBriefRequirements />
      <CampaignJoinTimeline data={data} />
    </section>
  );
}
