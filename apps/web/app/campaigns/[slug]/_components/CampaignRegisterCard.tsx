"use client";

import { CreatorCampaignApplyButton } from "@/app/campaigns/_components/CreatorCampaignApplyButton";
import type { CampaignDetailDTO } from "@/lib/dto/campaign-detail";

function shortDate(value: string | null) {
  if (!value) return "Đang cập nhật";
  return new Date(value).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" });
}

function campaignState(data: CampaignDetailDTO) {
  const startAt = data.timeline.approvedAt ? new Date(data.timeline.approvedAt).getTime() : null;
  const endAt = data.hero.deadline ? new Date(data.hero.deadline).getTime() : null;
  const now = Date.now();
  if (data.hero.status === "COMPLETED" || data.hero.status === "CANCELLED" || data.hero.status === "ARCHIVED" || (endAt && endAt <= now)) {
    return { label: "ĐÃ KẾT THÚC", className: "border-red-200 bg-red-50 text-red-700", disabledLabel: "Đã kết thúc" };
  }
  if (startAt && startAt > now) {
    return { label: "SẮP DIỄN RA", className: "border-amber-200 bg-amber-50 text-amber-700", disabledLabel: "Chưa mở đăng ký" };
  }
  return { label: "ĐANG MỞ", className: "border-emerald-200 bg-emerald-50 text-emerald-700", disabledLabel: null };
}

export function CampaignRegisterCard({ data, dark = false }: { data: CampaignDetailDTO; dark?: boolean }) {
  const state = campaignState(data);
  const totalSlots = data.videoStats.targetVideos;
  const usedSlots = totalSlots > 0 ? Math.min(totalSlots, data.videoStats.creatorJoined) : data.videoStats.creatorJoined;
  const remainingSlots = totalSlots > 0 ? Math.max(0, totalSlots - usedSlots) : data.videoStats.remainingSlots;
  const slotPercent = totalSlots > 0 ? Math.min(100, Math.round((usedSlots / totalSlots) * 100)) : 0;
  const unavailableLabel = state.disabledLabel ?? (data.videoStats.isQuotaReached ? "Hết slot" : null);

  return (
    <section className={`rounded-[28px] border p-5 shadow-2xl backdrop-blur-md md:p-6 ${dark ? "border-white/20 bg-black/55 text-white" : "border-zinc-200 bg-white text-zinc-900"}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className={`text-xs font-bold uppercase tracking-[0.18em] ${dark ? "text-emerald-200" : "text-emerald-700"}`}>Creator application</p>
          <h2 className="mt-2 text-2xl font-black">Đăng ký chiến dịch Creator</h2>
        </div>
        <span className={`rounded-full border px-3 py-1 text-[11px] font-black tracking-wide ${state.className}`}>{state.label}</span>
      </div>
      <p className={`mt-3 text-sm ${dark ? "text-zinc-200" : "text-zinc-600"}`}>
        {shortDate(data.timeline.approvedAt ?? data.timeline.createdAt)} → {shortDate(data.hero.deadline)}
      </p>
      <p className={`mt-1 text-xs ${dark ? "text-zinc-300" : "text-zinc-500"}`}>Hạn đăng ký: {data.funding.remainingTimeLabel}</p>
      <div className="mt-5 flex items-end justify-between gap-3">
        <div>
          <p className={`text-xs font-bold uppercase tracking-wider ${dark ? "text-zinc-300" : "text-zinc-500"}`}>Slots đăng ký</p>
          <p className="mt-1 text-3xl font-black">{usedSlots}/{totalSlots || "∞"}</p>
        </div>
        <p className={`text-xs font-semibold ${dark ? "text-emerald-200" : "text-emerald-700"}`}>Còn {remainingSlots} slot trống</p>
      </div>
      <div className={`mt-3 h-2.5 overflow-hidden rounded-full ${dark ? "bg-white/15" : "bg-zinc-100"}`}>
        <div className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-teal-500 transition-all" style={{ width: `${slotPercent}%` }} />
      </div>
      <div className="mt-5">
        {unavailableLabel ? (
          <button type="button" disabled className="w-full rounded-full bg-zinc-200 px-5 py-3 font-semibold text-zinc-500 opacity-80">{unavailableLabel}</button>
        ) : (
          <CreatorCampaignApplyButton slug={data.hero.slug} />
        )}
      </div>
    </section>
  );
}
