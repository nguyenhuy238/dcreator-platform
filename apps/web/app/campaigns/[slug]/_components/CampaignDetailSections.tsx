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

function splitByComma(value: string | null): string[] {
  return (value ?? "")
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
}

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
            <p className="mt-3 max-w-3xl text-base font-semibold text-zinc-100">Brand/SME: {data.hero.brand}</p>
          </div>
          <div className="hidden lg:block">{applyCard}</div>
        </div>
      </div>
    </section>
  );
}

export function OverviewTab({ data }: { data: CampaignDetailDTO }) {
  const [activeStep, setActiveStep] = useState<number>(1);
  const [introExpanded, setIntroExpanded] = useState(false);
  const heroMeta = buildHeroMeta(data);
  const missionTypes = splitByComma(data.hero.missionTypes);
  const channels = splitByComma(data.hero.priorityChannels);
  const journeySteps = useMemo(
    () => [
      { id: 1, title: "Bước 1: Apply chiến dịch", detail: "Bấm Apply, nộp link kênh TikTok và chờ Brand/Admin duyệt." },
      { id: 2, title: "Bước 2: Nhận sản phẩm", detail: "Được gửi hàng hoặc tự mua theo chính sách và chuẩn bị nội dung review." },
      { id: 3, title: "Bước 3: Sản xuất nội dung", detail: "Quay video theo brief, đảm bảo đúng key message và định dạng yêu cầu." },
      { id: 4, title: "Bước 4: Đăng và nộp bài", detail: "Đăng video công khai, lấy mã Spark Ads, submit link và mã về dCreator." }
    ],
    []
  );

  return (
    <section className="grid gap-4">
      <article className="dc-card overflow-hidden">
        <button
          type="button"
          onClick={() => setIntroExpanded((prev) => !prev)}
          className="w-full px-5 py-5 text-left"
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="text-2xl font-black text-zinc-900">{"Gi\u1edbi thi\u1ec7u camp"}</h3>
              <p className="mt-2 text-slate-700">{data.hero.description}</p>
            </div>
            <span className="mt-1 text-xs font-bold uppercase tracking-wide text-zinc-500">
              {introExpanded ? "Thu g\u1ecdn" : "Xem th\u00eam"}
            </span>
          </div>
        </button>
        {introExpanded ? (
          <div className="border-t border-zinc-100 px-5 pb-5 pt-4">
            <div className="grid gap-x-8 gap-y-2 text-sm text-zinc-700 md:grid-cols-2">
              <p>Brand/SME: {data.hero.brand}</p>
              <p>{"Ng\u00e0nh h\u00e0ng"}: {categoryLabel[data.hero.category]}</p>
              <p>{"Lo\u1ea1i s\u1ea3n ph\u1ea9m"}: {data.rewards[0]?.title ?? "\u0110ang c\u1eadp nh\u1eadt"}</p>
              <p>{"M\u1ee5c ti\u00eau ch\u00ednh"}: {data.hero.objective ?? "\u0110ang c\u1eadp nh\u1eadt"}</p>
              <p>{"Th\u1eddi gian"}: {formatDateTime(heroMeta.startAt)} - {heroMeta.endAt ? formatDateTime(heroMeta.endAt) : "\u0110ang c\u1eadp nh\u1eadt"}</p>
              <p>{"M\u1ed1c \u0111\u0103ng k\u00fd Creator"}: {formatDateTime(heroMeta.registerDeadline)}</p>
              <p>{"M\u1ed1c n\u1ed9p content"}: {heroMeta.submitDeadline ? formatDateTime(heroMeta.submitDeadline) : "\u0110ang c\u1eadp nh\u1eadt"}</p>
              <p>{"K\u00eanh ch\u00ednh"}: {channels.length ? channels.join(", ") : "\u0110ang c\u1eadp nh\u1eadt"}</p>
              <p>{"Nhi\u1ec7m v\u1ee5 ch\u00ednh"}: {missionTypes.length ? missionTypes.join(", ") : "\u0110ang c\u1eadp nh\u1eadt"}</p>
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
            <p className="text-xs font-semibold uppercase tracking-wider text-sky-700">Yêu cầu</p>
            <p className="mt-2 text-2xl font-black text-sky-900">{Math.max(1, data.missions.length)} Video TikTok</p>
          </div>
          <div className="rounded-2xl border border-violet-200 bg-violet-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-violet-700">Kho thưởng</p>
            <p className="mt-2 text-2xl font-black text-violet-900">{data.rewards.length} gói quyền lợi</p>
          </div>
        </div>
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
        <h3 className="text-2xl font-black text-zinc-900">Gói quyền lợi & KPI</h3>
        <div className="mt-3 grid gap-4">
          <div>
            <p className="font-bold text-zinc-900">Chỉ số kỳ vọng</p>
            <p className="text-slate-700">
              Số video: {Math.max(1, data.missions.length)}. Số đơn mục tiêu: {Math.max(50, data.funding.backerCount * 5)}. GMV mục tiêu:{" "}
              {data.funding.targetAmountVnd.toLocaleString("vi-VN")} VND. Tệp khách hàng: Gen Z, người dùng mua sắm online.
            </p>
          </div>
          <div>
            <p className="font-bold text-zinc-900">Loại nhiệm vụ</p>
            <p className="text-slate-700">{missionTypes.length ? missionTypes.join(", ") : "Đang cập nhật"}</p>
          </div>
          <div>
            <p className="font-bold text-zinc-900">Quyền lợi cho Creator</p>
            <p className="text-slate-700">
              Hoa hồng Creator: {data.hero.creatorCommissionPercent}% theo đơn, bonus quỹ thêm {data.hero.bonusBudgetVnd.toLocaleString("vi-VN")} VND.
            </p>
          </div>
          <div>
            <p className="font-bold text-zinc-900">Quyền lợi cho User</p>
            <p className="text-slate-700">Hoa hồng User: {data.hero.userCommissionPercent}% và ưu đãi theo kênh {channels.join(", ") || "đang cập nhật"}.</p>
          </div>
        </div>
      </article>
    </section>
  );
}

export function BriefTab({ data }: { data: CampaignDetailDTO }) {
  const missionTypes = splitByComma(data.hero.missionTypes);
  const channels = splitByComma(data.hero.priorityChannels);
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
          <p>Mục tiêu truyền thông: {data.hero.objective ?? "Đang cập nhật"}</p>
          <p>Định dạng nội dung: vertical 9:16, thời lượng từ 30-90 giây, tối thiểu 20 giây.</p>
          <p>Key message: bám sát brief campaign và thể hiện trải nghiệm chân thực.</p>
          <p>Kênh đăng chính: {channels.length ? channels.join(", ") : "Đang cập nhật"}.</p>
          <p>Loại nhiệm vụ: {missionTypes.length ? missionTypes.join(", ") : "Đang cập nhật"}.</p>
          <p>Hashtag/caption gợi ý: #dCreator #VideoSeeding #ReviewThat.</p>
          <p>Quy định kịch bản: review chân thực, không nói quá, không claim sai quy định quảng cáo.</p>
        </div>
      </article>
      <article className="dc-card p-5">
        <h3 className="text-2xl font-black text-zinc-900">Điều kiện tham gia camp</h3>
        <div className="mt-3 grid gap-2 text-slate-700">
          <p>Creator tối thiểu 1,000 follower, có kênh phù hợp ngành hàng.</p>
          <p>Khu vực áp dụng: toàn quốc (camp có gửi hàng và hỗ trợ online).</p>
          <p>Số lượng Creator tối đa: 20, slot còn lại cập nhật theo thời gian thực.</p>
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
