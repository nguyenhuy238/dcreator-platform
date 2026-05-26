"use client";

import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import type { CampaignDetailDTO } from "@/lib/dto/campaign-detail";
import { getCampaignTypeLabel } from "@/lib/constants/campaign-type";
import { formatDateTime } from "./campaign-detail.utils";

const categoryLabel: Record<CampaignDetailDTO["hero"]["category"], string> = {
  TECH: "Công nghệ",
  FASHION: "Thời trang",
  FOOD: "Ẩm thực",
  BEAUTY: "Làm đẹp",
  LIFESTYLE: "Lifestyle",
  EDUCATION: "Giáo dục"
};

function buildHeroMeta(data: CampaignDetailDTO) {
  const startAt = data.timeline.approvedAt ?? data.timeline.createdAt;
  const endAt = data.hero.deadline;
  return {
    startAt,
    endAt,
    registerDeadline: startAt,
    submitDeadline: endAt
  };
}

export function HeroSection({ data, applyCard }: { data: CampaignDetailDTO; applyCard: ReactNode }) {
  return (
    <section className="relative overflow-hidden rounded-3xl border border-zinc-200 bg-zinc-950 text-white">
      {data.hero.coverMediaType === "video" && data.hero.coverMediaUrl ? (
        <video className="h-[360px] w-full object-cover opacity-45 md:h-[460px]" src={data.hero.coverMediaUrl} autoPlay muted loop playsInline />
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img className="h-[360px] w-full object-cover opacity-45 md:h-[460px]" src={data.hero.coverMediaUrl ?? "/globe.svg"} alt={data.hero.title} />
      )}
      <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/50 to-black/90" />
      <div className="absolute inset-0 p-5 md:p-8">
        <div className="grid h-full gap-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-end">
          <div>
            <span className="inline-flex rounded-full border border-fuchsia-300/60 bg-fuchsia-500/20 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-fuchsia-100">
              {getCampaignTypeLabel()}
            </span>
            <h1 className="mt-4 max-w-4xl text-3xl font-black tracking-tight md:text-6xl">{data.hero.title}</h1>
            <p className="mt-3 max-w-3xl text-sm text-zinc-100 md:text-base">Brand/SME: {data.hero.brand}</p>
          </div>
          <div className="hidden lg:block">{applyCard}</div>
        </div>
      </div>
    </section>
  );
}

export function OverviewTab({ data }: { data: CampaignDetailDTO }) {
  const [introExpanded, setIntroExpanded] = useState(false);
  const [activeStep, setActiveStep] = useState<number>(1);
  const heroMeta = buildHeroMeta(data);
  const channels = ["TikTok"];
  const missionTypes = data.missions.map((mission) => mission.title).filter(Boolean);
  const journeySteps = useMemo(
    () => data.hero.participationRoadmap.map((detail, idx) => ({ id: idx + 1, title: `Bước ${idx + 1}`, detail })),
    [data.hero.participationRoadmap]
  );

  return (
    <section className="grid gap-4">
      <article className="dc-card overflow-hidden">
        <button type="button" onClick={() => setIntroExpanded((prev) => !prev)} className="w-full px-5 py-5 text-left">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="text-2xl font-black text-zinc-900">Giới thiệu camp</h3>
              <p className="mt-2 text-slate-700">{data.hero.description}</p>
            </div>
            <span className="mt-1 text-xs font-bold uppercase tracking-wide text-zinc-500">{introExpanded ? "Thu gọn" : "Xem thêm"}</span>
          </div>
        </button>
        {introExpanded ? (
          <div className="border-t border-zinc-100 px-5 pb-5 pt-4">
            <div className="grid gap-x-8 gap-y-2 text-sm text-zinc-700 md:grid-cols-2">
              <p>Brand/SME: {data.hero.brand}</p>
              <p>Ngành hàng: {categoryLabel[data.hero.category]}</p>
              <p>Loại sản phẩm: {data.rewards[0]?.title ?? "Đang cập nhật"}</p>
              <p>Mục tiêu chính: {data.hero.objective ?? "Đang cập nhật"}</p>
              <p>Thời gian: {formatDateTime(heroMeta.startAt)} - {heroMeta.endAt ? formatDateTime(heroMeta.endAt) : "Đang cập nhật"}</p>
              <p>Mốc đăng ký Creator: {formatDateTime(heroMeta.registerDeadline)}</p>
              <p>Mốc nộp content: {heroMeta.submitDeadline ? formatDateTime(heroMeta.submitDeadline) : "Đang cập nhật"}</p>
              <p>Kênh chính: {channels.length ? channels.join(", ") : "Đang cập nhật"}</p>
              <p>Nhiệm vụ chính: {missionTypes.length ? missionTypes.join(", ") : "Đang cập nhật"}</p>
            </div>
          </div>
        ) : null}
      </article>

      <article className="dc-card p-5">
        <h3 className="text-2xl font-black text-zinc-900">Tổng quan deal</h3>
        <div className="mt-3 grid gap-3 md:grid-cols-3">
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-emerald-700">Thù lao</p>
            <p className="mt-2 text-2xl font-black text-emerald-900">Theo KPI</p>
          </div>
          <div className="rounded-2xl border border-sky-200 bg-sky-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-sky-700">Video hiện tại / mục tiêu</p>
            <p className="mt-2 text-2xl font-black text-sky-900">
              {data.videoStats.approvedVideos}/{data.videoStats.targetVideos}
            </p>
          </div>
          <div className="rounded-2xl border border-violet-200 bg-violet-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-violet-700">Creator đã tham gia</p>
            <p className="mt-2 text-2xl font-black text-violet-900">{data.videoStats.creatorJoined}</p>
          </div>
        </div>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-zinc-100">
          <div className="h-full bg-zinc-900 transition-all" style={{ width: `${data.videoStats.completionPercent}%` }} />
        </div>
        <p className="mt-1 text-xs text-zinc-500">Tiến độ video: {data.videoStats.completionPercent}%</p>
      </article>

      <article className="dc-card p-5">
        <h3 className="text-2xl font-black text-zinc-900">Sản phẩm review</h3>
        <div className="mt-3 grid gap-2">
          {data.rewards.map((reward) => (
            <div key={reward.id} className="rounded-2xl border border-zinc-200 bg-white p-4">
              <p className="text-lg font-bold text-zinc-900">{reward.title}</p>
              <p className="text-sm text-slate-600">{reward.description}</p>
            </div>
          ))}
        </div>
      </article>

      <article className="dc-card p-5">
        <h3 className="text-2xl font-black text-zinc-900">Lộ trình tham gia</h3>
        <div className="mt-3 grid gap-2">
          {journeySteps.map((step) => (
            <button
              key={step.id}
              type="button"
              onClick={() => setActiveStep(step.id)}
              className={`rounded-2xl border p-4 text-left ${activeStep === step.id ? "border-zinc-900 bg-zinc-900 text-white" : "border-zinc-200 bg-white text-zinc-900"}`}
            >
              <p className="font-bold">{step.title}</p>
              {activeStep === step.id ? <p className="mt-1 text-sm text-zinc-100">{step.detail}</p> : null}
            </button>
          ))}
        </div>
      </article>

      <article className="dc-card p-5">
        <h3 className="text-2xl font-black text-zinc-900">Gói quyền lợi và KPI</h3>
        <div className="mt-3 grid gap-4">
          <div>
            <p className="font-bold text-zinc-900">Chỉ số kỳ vọng</p>
            <p className="text-slate-700">
              Số video mục tiêu: {data.videoStats.targetVideos}. Video đã duyệt: {data.videoStats.approvedVideos}. Creator đã tham gia: {data.videoStats.creatorJoined}. GMV mục tiêu:{" "}
              {data.funding.targetAmountVnd.toLocaleString("vi-VN")} VND.
            </p>
          </div>
          <div>
            <p className="font-bold text-zinc-900">Loại nhiệm vụ</p>
            <p className="text-slate-700">{data.missions.length ? `${data.missions.length} nhiệm vụ` : "Đang cập nhật"}</p>
          </div>
          <div>
            <p className="font-bold text-zinc-900">Quyền lợi</p>
            <p className="text-slate-700">{data.hero.benefits ?? "Đang cập nhật"}</p>
          </div>
        </div>
      </article>
    </section>
  );
}

export function BriefTab({ data }: { data: CampaignDetailDTO }) {
  const submitGuide = [
    "Quay video review theo brief phía trên",
    "Đăng lên TikTok (chế độ công khai, không set private)",
    "Lấy mã Spark Ads từ TikTok Creator Tools",
    "Quay lại dCreator -> vào Nhiệm Vụ -> Submit link video + mã Spark Ads"
  ];

  return (
    <section className="grid gap-4">
      <article className="dc-card p-5">
        <h3 className="text-2xl font-black text-zinc-900">Brief chi tiết cho Creator</h3>
        <div className="mt-3 grid gap-2 text-slate-700">
          <p>Mô tả sản phẩm/dự án: {data.hero.description}</p>
          <p>Quyền lợi: {data.hero.benefits ?? "Đang cập nhật"}</p>
          <p>Định dạng nội dung: vertical 9:16, thời lượng từ 30-90 giây, tối thiểu 20 giây.</p>
          <p>Key message: bám sát brief campaign và thể hiện trải nghiệm chân thực.</p>
          <p>Số bước tham gia: {data.hero.participationRoadmap.length || 0}.</p>
          <p>Loại nhiệm vụ: {data.missions.length ? `${data.missions.length} nhiệm vụ` : "Đang cập nhật"}.</p>
          <p>Hashtag/caption gợi ý: #dCreator #VideoSeeding #ReviewThat.</p>
          <p>Quy định kịch bản: review chân thực, không nói quá, không claim sai quy định quảng cáo.</p>
        </div>
      </article>
      <article className="dc-card p-5">
        <h3 className="text-2xl font-black text-zinc-900">Điều kiện tham gia camp</h3>
        <div className="mt-3 grid gap-2 text-slate-700">
          <p>Creator tối thiểu 1,000 follower, có kênh phù hợp ngành hàng.</p>
          <p>Khu vực áp dụng: toàn quốc (camp có gửi hàng và hỗ trợ online).</p>
          <p>Số lượng Creator tối đa: {data.videoStats.targetVideos}, slot còn lại: {data.videoStats.remainingSlots}.</p>
          <p>Quy trình đăng ký: bấm Apply, nộp link kênh, chờ duyệt trong 24-72 giờ.</p>
        </div>
      </article>
      <article className="rounded-3xl border border-zinc-800 bg-zinc-900 p-5 text-zinc-100">
        <h3 className="text-2xl font-black">Hướng dẫn gửi bài</h3>
        <ol className="mt-3 grid gap-2">
          {submitGuide.map((step, index) => (
            <li key={step} className="flex items-start gap-2">
              <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-zinc-700 text-sm font-bold">{index + 1}</span>
              <span>{step}</span>
            </li>
          ))}
        </ol>
      </article>
    </section>
  );
}
