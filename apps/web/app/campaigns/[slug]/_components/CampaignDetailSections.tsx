import type { CampaignDetailDTO } from "@/lib/dto/campaign-detail";
import { formatCurrencyVnd, formatDateTime } from "./campaign-detail.utils";

type CTA = { label: string; disabled: boolean };

export function HeroSection({ hero }: { hero: CampaignDetailDTO["hero"] }) {
  return (
    <section className="dc-card overflow-hidden p-4 md:p-5">
      {hero.coverMediaType === "video" && hero.coverMediaUrl ? (
        <video className="h-60 w-full rounded-2xl border border-zinc-200 object-cover md:h-80" src={hero.coverMediaUrl} controls />
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img className="h-60 w-full rounded-2xl border border-zinc-200 object-cover md:h-80" src={hero.coverMediaUrl ?? "/globe.svg"} alt={hero.title} />
      )}
      <h1 className="mt-3 text-3xl font-black tracking-tight text-zinc-900">{hero.title}</h1>
      <p className="mt-2 text-slate-600">{hero.description}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-semibold text-zinc-700">Brand: {hero.brand}</span>
        <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-semibold text-zinc-700">Creator: {hero.creator ?? "Chưa có"}</span>
        <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-semibold text-zinc-700">Loại: {hero.campaignType}</span>
        <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-semibold text-zinc-700">Trạng thái: {hero.status}</span>
        <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-semibold text-zinc-700">Hạn chót: {formatDateTime(hero.deadline)}</span>
      </div>
    </section>
  );
}

export function FundingSection({ funding }: { funding: CampaignDetailDTO["funding"] }) {
  return (
    <section className="dc-card p-4 md:p-5">
      <h2 className="text-2xl font-black text-zinc-900">Tiến độ ủng hộ</h2>
      <div className="mt-3 grid gap-3 md:grid-cols-2">
        <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-3">
          <p className="text-xs uppercase tracking-wider text-zinc-500">Mục tiêu</p>
          <p className="mt-1 text-2xl font-black tracking-tight text-zinc-900">{formatCurrencyVnd(funding.targetAmountVnd)}</p>
        </div>
        <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-3">
          <p className="text-xs uppercase tracking-wider text-zinc-500">Đã ủng hộ</p>
          <p className="mt-1 text-2xl font-black tracking-tight text-zinc-900">{formatCurrencyVnd(funding.fundedAmountVnd)}</p>
        </div>
      </div>
      <div className="mt-3 h-3 overflow-hidden rounded-full bg-zinc-100">
        <div className="h-full bg-gradient-to-r from-zinc-900 to-zinc-500" style={{ width: `${funding.progressPercent}%` }} />
      </div>
      <p className="mt-2 text-3xl font-black tracking-tight text-zinc-900">{funding.progressPercent}%</p>
      <div className="flex flex-wrap gap-4 text-sm text-slate-600">
        <p>{funding.backerCount} backers</p>
        <p>Còn lại: {funding.remainingTimeLabel}</p>
      </div>
    </section>
  );
}

export function CampaignStatsSection({ data }: { data: CampaignDetailDTO }) {
  const outOfStockCount = data.rewards.filter((reward) => reward.isOutOfStock).length;
  const openMissionCount = data.missions.filter((mission) => mission.status === "OPEN").length;
  const missionRewardPoints = data.missions.reduce((sum, mission) => sum + mission.rewardPoints, 0);

  return (
    <section className="dc-card p-4 md:p-5">
      <h2 className="text-2xl font-black text-zinc-900">Chỉ số campaign</h2>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <article className="rounded-2xl border border-zinc-200 bg-zinc-50 p-3">
          <p className="text-xs uppercase tracking-wider text-zinc-500">Backers</p>
          <p className="mt-1 text-xl font-black text-zinc-900">{data.funding.backerCount}</p>
        </article>
        <article className="rounded-2xl border border-zinc-200 bg-zinc-50 p-3">
          <p className="text-xs uppercase tracking-wider text-zinc-500">Tiến độ</p>
          <p className="mt-1 text-xl font-black text-zinc-900">{data.funding.progressPercent}%</p>
        </article>
        <article className="rounded-2xl border border-zinc-200 bg-zinc-50 p-3">
          <p className="text-xs uppercase tracking-wider text-zinc-500">Mission đang mở</p>
          <p className="mt-1 text-xl font-black text-zinc-900">{openMissionCount}</p>
        </article>
        <article className="rounded-2xl border border-zinc-200 bg-zinc-50 p-3">
          <p className="text-xs uppercase tracking-wider text-zinc-500">Reward hết lượt</p>
          <p className="mt-1 text-xl font-black text-zinc-900">{outOfStockCount}</p>
        </article>
      </div>
      <p className="mt-2 text-sm text-slate-600">Tổng điểm mission: {missionRewardPoints.toLocaleString("vi-VN")} points</p>
    </section>
  );
}

export function RewardsSection({
  campaignTitle,
  rewards,
  selectedRewardId,
  onSelect,
  cta,
  onSupport
}: {
  campaignTitle: string;
  rewards: CampaignDetailDTO["rewards"];
  selectedRewardId: string | null;
  onSelect: (id: string) => void;
  cta: CTA;
  onSupport: () => void;
}) {
  return (
    <section className="dc-card p-4 md:p-5">
      <h2 className="text-2xl font-black text-zinc-900">Các mức reward</h2>
      <p className="mt-1 text-sm text-slate-600">Chọn 1 reward để ủng hộ campaign {campaignTitle}.</p>
      <div className="mt-3 grid gap-3">
        {rewards.map((reward) => {
          const selected = reward.id === selectedRewardId;
          return (
            <article
              key={reward.id}
              className={`relative rounded-2xl border p-4 ${selected ? "border-zinc-900 shadow-[0_0_0_2px_rgba(24,24,27,0.1)]" : "border-zinc-200 bg-white"}`}
            >
              {reward.isOutOfStock ? <span className="absolute right-3 top-3 rounded-full bg-red-50 px-2 py-1 text-xs font-semibold text-red-700">Hết lượt</span> : null}
              <h3 className="text-xl font-bold text-zinc-900">{reward.title}</h3>
              <p className="mt-1 text-slate-600">{reward.description}</p>
              <p className="mt-2 text-sm text-slate-700">
                Giá: {reward.priceVnd ? formatCurrencyVnd(reward.priceVnd) : `${reward.pricePoints} points`}
              </p>
              <p className="text-sm text-slate-700">
                Tồn kho: {reward.stockRemaining}/{reward.stockTotal}
              </p>
              <p className="text-sm text-slate-700">Dự kiến giao: {reward.estimatedDelivery}</p>
              <div className="mt-2">
                <button
                  type="button"
                  className={selected ? "dc-btn-primary" : "dc-btn-secondary"}
                  onClick={() => onSelect(reward.id)}
                  disabled={reward.isOutOfStock}
                >
                  {reward.isOutOfStock ? "Hết lượt" : selected ? "Đã chọn" : "Chọn reward"}
                </button>
              </div>
            </article>
          );
        })}
      </div>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-zinc-200 pt-3">
        <button type="button" className="dc-btn-primary" disabled={cta.disabled} onClick={onSupport}>
          {cta.label}
        </button>
        <span className="text-sm text-slate-600">Ủng hộ campaign theo reward và phương thức thanh toán.</span>
      </div>
    </section>
  );
}

export function MissionsSection({ missions }: { missions: CampaignDetailDTO["missions"] }) {
  return (
    <section className="dc-card p-4 md:p-5">
      <h2 className="text-2xl font-black text-zinc-900">Missions</h2>
      <div className="mt-3 grid gap-3">
        {missions.map((mission) => (
          <article key={mission.id} className="rounded-2xl border border-zinc-200 bg-white p-4">
            <h3>{mission.title}</h3>
            <p>Điểm thưởng: {mission.rewardPoints}</p>
            <p>Hạn chót: {formatDateTime(mission.deadline)}</p>
            <p>Điều kiện: {mission.eligibility}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

export function TimelineSection({ timeline }: { timeline: CampaignDetailDTO["timeline"] }) {
  return (
    <section className="dc-card p-4 md:p-5">
      <h2 className="text-2xl font-black text-zinc-900">Mốc thời gian</h2>
      <p>Tạo campaign: {formatDateTime(timeline.createdAt)}</p>
      <p>Duyệt campaign: {formatDateTime(timeline.approvedAt)}</p>
      <div className="mt-3 grid gap-3">
        {timeline.milestoneUpdates.map((item, index) => (
          <article key={`${item.at}-${index}`} className="rounded-2xl border border-zinc-200 bg-white p-4">
            <strong>{item.label}</strong>
            <p>{formatDateTime(item.at)}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

export function BackersSection({ socialProof }: { socialProof: CampaignDetailDTO["socialProof"] }) {
  return (
    <section className="dc-card p-4 md:p-5">
      <h2 className="text-2xl font-black text-zinc-900">Backers & social proof</h2>
      <p>Tổng người ủng hộ: {socialProof.totalBackers}</p>
      <div className="mt-3 grid gap-3">
        {socialProof.recentContributions.map((contribution) => (
          <article key={contribution.id} className="rounded-2xl border border-zinc-200 bg-white p-4">
            <p>{contribution.supporterMasked}</p>
            <p>{formatCurrencyVnd(contribution.amountVnd)}</p>
            <p>{formatDateTime(contribution.contributedAt)}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

export function FaqPolicySection({ faqPolicy }: { faqPolicy: CampaignDetailDTO["faqPolicy"] }) {
  return (
    <section className="dc-card p-4 md:p-5">
      <h2 className="text-2xl font-black text-zinc-900">FAQ/Chính sách</h2>
      <p>Chính sách reward: {faqPolicy.rewardPolicy}</p>
      <p>Chính sách hoàn tiền: {faqPolicy.refundPolicy}</p>
      <p>Cách dùng voucher: {faqPolicy.voucherUsage}</p>
      <p>Chính sách khi campaign thất bại: {faqPolicy.campaignFailurePolicy}</p>
    </section>
  );
}
