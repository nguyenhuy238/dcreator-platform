"use client";

import type { ReactNode } from "react";
import { CampaignCoverImage } from "@/app/components/dcreator/ui/CampaignCoverImage";
import type { CampaignDetailDTO } from "@/lib/dto/campaign-detail";
import { getCampaignTypeLabel } from "@/lib/constants/campaign-type";
import { CAMPAIGN_IMAGE_FALLBACK, resolveImageUrl } from "@/lib/images/resolve-image-url";
import { CampaignBriefRequirements } from "./CampaignBriefRequirements";
import { CampaignReviewProducts } from "./CampaignReviewProducts";
import { formatDateTime } from "./campaign-detail.utils";

const DEFAULT_PARTICIPATION_STEPS = [
  {
    title: "ĐĂNG KÝ THAM GIA",
    description: "Tạo hồ sơ Creator và kết nối kênh mạng xã hội."
  },
  {
    title: "CHỌN CAMPAIGN",
    description: "Khám phá chiến dịch phù hợp và gửi đăng ký tham gia."
  },
  {
    title: "NHẬN SẢN PHẨM",
    description: "Được Brand phê duyệt và nhận sản phẩm hoặc reward trải nghiệm."
  },
  {
    title: "TẠO & ĐĂNG NỘI DUNG",
    description: "Sản xuất video review và đăng tải lên nền tảng Social Commerce."
  },
  {
    title: "NHẬN THU NHẬP",
    description: "Nhận tiền hoa hồng affiliate lên tới 12% cho mỗi đơn hàng"
  }
];

function getDisplayLines(value: string) {
  return value
    .split(/\r?\n/)
    .map((line) => line.replace(/^\s*[-•]\s*/, "").trim())
    .filter(Boolean);
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
          <span className="inline-flex rounded-full border border-emerald-200/40 bg-emerald-500/20 px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] text-emerald-100">
            {getCampaignTypeLabel()}
          </span>
          <h1 className="mt-4 max-w-4xl break-words text-3xl font-black tracking-tight sm:text-4xl md:text-6xl">{data.hero.title}</h1>
          <p className="mt-3 break-words text-base font-semibold text-zinc-100">Brand: {data.hero.brand}</p>
        </div>
        <div className="hidden lg:block">{applyCard}</div>
      </div>
    </section>
  );
}

function CampaignDealOverview({ data }: { data: CampaignDetailDTO }) {
  const mission = data.missions[0] ?? null;
  const benefitCard = {
    eyebrow: "QUYỀN LỢI",
    title: data.hero.benefits || "Nhận voucher/sản phẩm review free",
    color: "from-emerald-50 to-teal-100"
  };
  const requirementCard = {
    eyebrow: "YÊU CẦU",
    title: mission?.description || "01 Video + 01 Đánh giá sản phẩm",
    color: "from-sky-50 to-cyan-100"
  };
  const deadlineCard = {
    eyebrow: "THỜI HẠN",
    title: formatDateTime(mission?.deadline ?? data.hero.deadline),
    color: "from-amber-50 to-orange-100"
  };
  const benefitLines = getDisplayLines(benefitCard.title);

  return (
    <section className="dc-card p-5 md:p-6">
      <h3 className="text-[26px] font-extrabold text-zinc-950 md:text-3xl">Tổng Quan Deal</h3>
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <article
          className={`rounded-[24px] border border-white/70 bg-gradient-to-br ${benefitCard.color} p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-md md:col-span-2`}
        >
          <p className="text-[11px] font-bold uppercase text-zinc-500">{benefitCard.eyebrow}</p>
          <ul className="mt-4 grid gap-2.5">
            {benefitLines.map((line) => (
              <li key={line} className="flex gap-3 text-base font-medium leading-7 text-zinc-900 md:text-lg">
                <span className="mt-2.5 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" />
                <span className="min-w-0 break-words">{line}</span>
              </li>
            ))}
          </ul>
        </article>
        <article
          className={`rounded-[24px] border border-white/70 bg-gradient-to-br ${requirementCard.color} p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-md`}
        >
          <p className="text-[11px] font-bold uppercase text-zinc-500">{requirementCard.eyebrow}</p>
          <p className="mt-4 break-words text-lg font-semibold leading-7 text-zinc-950 md:text-xl">{requirementCard.title}</p>
        </article>
        <article
          className={`rounded-[24px] border border-white/70 bg-gradient-to-br ${deadlineCard.color} p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-md`}
        >
          <p className="text-[11px] font-bold uppercase text-zinc-500">{deadlineCard.eyebrow}</p>
          <p className="mt-4 break-words text-lg font-semibold leading-7 text-zinc-950 md:text-xl">{deadlineCard.title}</p>
        </article>
      </div>
    </section>
  );
}

function CampaignJoinTimeline() {
  return (
    <section>
      <h3 className="text-2xl font-black text-zinc-900">Lộ trình tham gia</h3>
      <ol className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {DEFAULT_PARTICIPATION_STEPS.map((step, index) => (
          <li
            key={step.title}
            className="relative min-h-[180px] rounded-[24px] border border-zinc-200 bg-white p-4 shadow-sm transition hover:-translate-y-1 hover:shadow-md"
          >
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-zinc-900 text-sm font-black text-white">
              {index + 1}
            </span>
            <p className="mt-4 break-words text-sm font-black leading-5 text-zinc-900">{step.title}</p>
            <p className="mt-2 break-words text-sm leading-6 text-zinc-600">{step.description}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}

export function OverviewTab({ data }: { data: CampaignDetailDTO }) {
  return (
    <section className="grid gap-8">
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_440px] lg:items-start">
        <CampaignDealOverview data={data} />
        <CampaignReviewProducts data={data} />
      </div>
      <CampaignJoinTimeline />
    </section>
  );
}

export function BriefTab({ data }: { data: CampaignDetailDTO }) {
  return (
    <section className="grid gap-4">
      <CampaignBriefRequirements hashtags={data.hero.requiredHashtags} />
      <CampaignJoinTimeline />
    </section>
  );
}
