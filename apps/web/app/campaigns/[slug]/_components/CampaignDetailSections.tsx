"use client";

import type { ReactNode } from "react";
import type { CampaignDetailDTO } from "@/lib/dto/campaign-detail";
import { getCampaignTypeLabel } from "@/lib/constants/campaign-type";
import { formatDateTime } from "./campaign-detail.utils";

const categoryLabel: Record<CampaignDetailDTO["hero"]["category"], string> = {
  TECH: "Công nghệ",
  FASHION: "Thời trang",
  FOOD: "Ẩm thực",
  BEAUTY: "Làm đẹp",
  LIFESTYLE: "Lối sống",
  EDUCATION: "Giáo dục"
};

function getAudienceLabel(value: CampaignDetailDTO["missions"][number]["audience"]) {
  return value === "CREATOR" ? "Nhà sáng tạo" : "Người dùng";
}

function getMissionStatusLabel(value: CampaignDetailDTO["missions"][number]["status"]) {
  const map: Record<CampaignDetailDTO["missions"][number]["status"], string> = {
    OPEN: "Đang mở",
    SUBMITTED: "Đã nộp",
    APPROVED: "Đã duyệt",
    REJECTED: "Đã từ chối"
  };
  return map[value];
}

function getProductReceiveLabel(value: CampaignDetailDTO["missions"][number]["productReceiveOption"]) {
  return value === "PRODUCT_REQUIRED" ? "Yêu cầu sản phẩm" : "Không yêu cầu sản phẩm";
}

function buildHeroMeta(data: CampaignDetailDTO) {
  return {
    startAt: data.timeline.approvedAt ?? data.timeline.createdAt,
    endAt: data.hero.deadline
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
            <span className="inline-flex rounded-full border border-zinc-300/60 bg-zinc-500/20 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-zinc-100">
              {getCampaignTypeLabel()}
            </span>
            <h1 className="mt-4 max-w-4xl text-3xl font-black tracking-tight md:text-6xl">{data.hero.title}</h1>
            <p className="mt-3 max-w-3xl text-sm text-zinc-100 md:text-base">Brand: {data.hero.brand}</p>
          </div>
          <div className="hidden lg:block">{applyCard}</div>
        </div>
      </div>
    </section>
  );
}

export function OverviewTab({ data }: { data: CampaignDetailDTO }) {
  const heroMeta = buildHeroMeta(data);
  const primaryMission = data.missions[0] ?? null;
  const roadmap = data.hero.participationRoadmap;

  return (
    <section className="grid gap-4">
      <article className="dc-card p-5">
        <h3 className="text-2xl font-black text-zinc-900">Thông tin chiến dịch</h3>
        <div className="mt-3 grid gap-x-8 gap-y-2 text-sm text-zinc-700 md:grid-cols-2">
          <p>Ngành hàng: {categoryLabel[data.hero.category]}</p>
          <p>Loại chiến dịch: {getCampaignTypeLabel()}</p>
          <p>Bắt đầu: {formatDateTime(heroMeta.startAt)}</p>
          <p>Kết thúc: {formatDateTime(heroMeta.endAt)}</p>
          <p>Mục tiêu chiến dịch: {data.hero.objective ?? "Đang cập nhật"}</p>
          <p>Trạng thái: {data.hero.status}</p>
        </div>
        <p className="mt-3 text-slate-700">{data.hero.description}</p>
      </article>

      <article className="dc-card p-5">
        <h3 className="text-2xl font-black text-zinc-900">Tiến độ video review</h3>
        <div className="mt-3 grid gap-3 md:grid-cols-3">
          <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-zinc-600">Mục tiêu video</p>
            <p className="mt-2 text-2xl font-black text-zinc-900">{data.videoStats.targetVideos}</p>
          </div>
          <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-zinc-600">Video đã duyệt</p>
            <p className="mt-2 text-2xl font-black text-zinc-900">{data.videoStats.approvedVideos}</p>
          </div>
          <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-zinc-600">Creator đã tham gia</p>
            <p className="mt-2 text-2xl font-black text-zinc-900">{data.videoStats.creatorJoined}</p>
          </div>
        </div>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-zinc-100">
          <div className="h-full bg-zinc-900 transition-all" style={{ width: `${data.videoStats.completionPercent}%` }} />
        </div>
        <p className="mt-2 text-xs text-zinc-500">
          Tiến độ: {data.videoStats.completionPercent}% • Slot còn lại: {data.videoStats.remainingSlots}
        </p>
      </article>

      <article className="dc-card p-5">
        <h3 className="text-2xl font-black text-zinc-900">Nhiệm vụ chính</h3>
        {!primaryMission ? (
          <p className="mt-3 text-sm text-zinc-600">Campaign chưa có nhiệm vụ.</p>
        ) : (
          <>
            <div className="mt-3 grid gap-x-8 gap-y-2 text-sm text-zinc-700 md:grid-cols-2">
              <p>Tên nhiệm vụ: {primaryMission.title}</p>
              <p>Đối tượng: {getAudienceLabel(primaryMission.audience)}</p>
              <p>Điểm thưởng: {primaryMission.rewardPoints.toLocaleString("vi-VN")} điểm</p>
              <p>Hạn nộp: {formatDateTime(primaryMission.deadline)}</p>
              <p>Yêu cầu sản phẩm: {getProductReceiveLabel(primaryMission.productReceiveOption)}</p>
              <p>Làm lại: {primaryMission.allowRepeat ? "Có" : "Không"}</p>
              <p>Trạng thái nhiệm vụ: {getMissionStatusLabel(primaryMission.status)}</p>
            </div>
            <p className="mt-3 text-slate-700">{primaryMission.description}</p>
            {primaryMission.productReceiveOption === "PRODUCT_REQUIRED" ? (
              <div className="mt-4 rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
                <h4 className="text-base font-bold text-zinc-900">Thông tin sản phẩm cần review</h4>
                <div className="mt-3 grid gap-4 md:grid-cols-[220px_minmax(0,1fr)]">
                  {primaryMission.productImageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={primaryMission.productImageUrl} alt={primaryMission.productName ?? "Sản phẩm"} className="h-44 w-full rounded-xl border border-zinc-200 object-cover" />
                  ) : (
                    <div className="h-44 rounded-xl border border-dashed border-zinc-300 bg-white" />
                  )}
                  <div className="grid gap-2 text-sm text-zinc-700">
                    <p>Tên sản phẩm: {primaryMission.productName ?? "Đang cập nhật"}</p>
                    <p>Mô tả: {primaryMission.productDescription ?? "Đang cập nhật"}</p>
                    <p>
                      Link sản phẩm:{" "}
                      {primaryMission.productLink ? (
                        <a href={primaryMission.productLink} target="_blank" rel="noreferrer" className="font-semibold text-zinc-900 underline">
                          Xem sản phẩm
                        </a>
                      ) : (
                        "Đang cập nhật"
                      )}
                    </p>
                  </div>
                </div>
              </div>
            ) : null}
          </>
        )}
      </article>

      <article className="dc-card p-5">
        <h3 className="text-2xl font-black text-zinc-900">Lộ trình tham gia</h3>
        {roadmap.length === 0 ? (
          <p className="mt-3 text-sm text-zinc-600">Đang cập nhật lộ trình.</p>
        ) : (
          <ol className="mt-3 grid gap-2">
            {roadmap.map((step, index) => (
              <li key={`${index + 1}-${step}`} className="rounded-2xl border border-zinc-200 bg-white p-4 text-sm text-zinc-700">
                <span className="font-bold text-zinc-900">Bước {index + 1}:</span> {step}
              </li>
            ))}
          </ol>
        )}
      </article>
    </section>
  );
}

export function BriefTab({ data }: { data: CampaignDetailDTO }) {
  const primaryMission = data.missions[0] ?? null;
  const submitGuide = [
    "Đăng ký tham gia campaign và chờ duyệt.",
    "Thực hiện nội dung theo mô tả nhiệm vụ và lộ trình ở trên.",
    "Nộp bài theo đúng deadline, đính kèm đầy đủ link/chứng từ theo yêu cầu."
  ];

  return (
    <section className="grid gap-4">
      <article className="dc-card p-5">
        <h3 className="text-2xl font-black text-zinc-900">Yêu cầu & brief</h3>
        <div className="mt-3 grid gap-2 text-slate-700">
          <p>Campaign: {data.hero.title}</p>
          <p>Mục tiêu: {data.hero.objective ?? "Đang cập nhật"}</p>
          <p>Quyền lợi: {data.hero.benefits ?? "Đang cập nhật"}</p>
          <p>Mô tả campaign: {data.hero.description}</p>
          {primaryMission ? <p>Mô tả nhiệm vụ: {primaryMission.description}</p> : null}
        </div>
      </article>

      <article className="dc-card p-5">
        <h3 className="text-2xl font-black text-zinc-900">Điều kiện tham gia</h3>
        <div className="mt-3 grid gap-2 text-slate-700">
          <p>Đối tượng: {primaryMission ? getAudienceLabel(primaryMission.audience) : "Nhà sáng tạo"}</p>
          <p>Số lượng video review tối đa: {data.videoStats.targetVideos}</p>
          <p>Slot còn lại: {data.videoStats.remainingSlots}</p>
          <p>Hạn cuối chiến dịch: {formatDateTime(data.hero.deadline)}</p>
          <p>Hạn cuối nhiệm vụ: {primaryMission ? formatDateTime(primaryMission.deadline) : "Đang cập nhật"}</p>
          <p>Yêu cầu sản phẩm: {primaryMission ? getProductReceiveLabel(primaryMission.productReceiveOption) : "Đang cập nhật"}</p>
        </div>
      </article>

      <article className="rounded-3xl border border-zinc-800 bg-zinc-900 p-5 text-zinc-100">
        <h3 className="text-2xl font-black">Checklist nộp bài</h3>
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
