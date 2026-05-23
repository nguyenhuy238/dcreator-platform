import type { CampaignDetailDTO } from "@/lib/dto/campaign-detail";
import styles from "../campaign-detail.module.css";
import { formatCurrencyVnd, formatDateTime } from "./campaign-detail.utils";

type CTA = { label: string; disabled: boolean };

export function HeroSection({ hero }: { hero: CampaignDetailDTO["hero"] }) {
  return (
    <section className={`${styles.panel} ${styles.heroPanel}`}>
      {hero.coverMediaType === "video" && hero.coverMediaUrl ? (
        <video className={styles.heroMedia} src={hero.coverMediaUrl} controls />
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img className={styles.heroMedia} src={hero.coverMediaUrl ?? "/globe.svg"} alt={hero.title} />
      )}
      <h1 className={styles.heroTitle}>{hero.title}</h1>
      <p className={styles.heroDescription}>{hero.description}</p>
      <div className={styles.meta}>
        <span className={styles.chip}>Brand: {hero.brand}</span>
        <span className={styles.chip}>Creator: {hero.creator ?? "Chưa có"}</span>
        <span className={styles.chip}>Loại: {hero.campaignType}</span>
        <span className={styles.chip}>Trạng thái: {hero.status}</span>
        <span className={styles.chip}>Hạn chót: {formatDateTime(hero.deadline)}</span>
      </div>
    </section>
  );
}

export function FundingSection({ funding }: { funding: CampaignDetailDTO["funding"] }) {
  return (
    <section className={`${styles.panel} ${styles.stickyPanel} ${styles.fundingPanel}`}>
      <h2 className={styles.sectionTitle}>Tiến độ ủng hộ</h2>
      <div className={styles.fundingGrid}>
        <div className={styles.fundingKpiCard}>
          <p className={styles.kpiLabel}>Mục tiêu</p>
          <p className={styles.kpiValue}>{formatCurrencyVnd(funding.targetAmountVnd)}</p>
        </div>
        <div className={styles.fundingKpiCard}>
          <p className={styles.kpiLabel}>Đã ủng hộ</p>
          <p className={styles.kpiValue}>{formatCurrencyVnd(funding.fundedAmountVnd)}</p>
        </div>
      </div>
      <div className={styles.progressTrack}>
        <div className={styles.progressBar} style={{ width: `${funding.progressPercent}%` }} />
      </div>
      <p className={styles.progressValue}>{funding.progressPercent}%</p>
      <div className={styles.fundingMeta}>
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
    <section className={styles.panel}>
      <h2 className={styles.sectionTitle}>Chỉ số campaign</h2>
      <div className={styles.statsGrid}>
        <article className={styles.statCard}>
          <p className={styles.kpiLabel}>Backers</p>
          <p className={styles.statValue}>{data.funding.backerCount}</p>
        </article>
        <article className={styles.statCard}>
          <p className={styles.kpiLabel}>Tiến độ</p>
          <p className={styles.statValue}>{data.funding.progressPercent}%</p>
        </article>
        <article className={styles.statCard}>
          <p className={styles.kpiLabel}>Mission đang mở</p>
          <p className={styles.statValue}>{openMissionCount}</p>
        </article>
        <article className={styles.statCard}>
          <p className={styles.kpiLabel}>Reward hết lượt</p>
          <p className={styles.statValue}>{outOfStockCount}</p>
        </article>
      </div>
      <p className={styles.inlineMuted}>Tổng điểm mission: {missionRewardPoints.toLocaleString("vi-VN")} points</p>
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
    <section className={`${styles.panel} ${styles.rewardPanel}`}>
      <h2 className={styles.sectionTitle}>Các mức reward</h2>
      <p className={`${styles.inlineMuted} ${styles.rewardIntro}`}>Chọn 1 reward để ủng hộ campaign {campaignTitle}.</p>
      <div className={styles.grid}>
        {rewards.map((reward) => {
          const selected = reward.id === selectedRewardId;
          return (
            <article
              key={reward.id}
              className={`${styles.rewardCard} ${selected ? styles.rewardCardSelected : ""}`}
            >
              {reward.isOutOfStock ? <span className={styles.outOfStockBadge}>Hết lượt</span> : null}
              <h3 className={styles.rewardTitle}>{reward.title}</h3>
              <p className={styles.rewardDescription}>{reward.description}</p>
              <p className={styles.rewardMeta}>
                Giá: {reward.priceVnd ? formatCurrencyVnd(reward.priceVnd) : `${reward.pricePoints} points`}
              </p>
              <p className={styles.rewardMeta}>
                Tồn kho: {reward.stockRemaining}/{reward.stockTotal}
              </p>
              <p className={styles.rewardMeta}>Dự kiến giao: {reward.estimatedDelivery}</p>
              <div className={styles.actions}>
                <button
                  type="button"
                  className={selected ? styles.primaryBtn : styles.secondaryBtn}
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
      <div className={`${styles.actions} ${styles.rewardCtaRow}`}>
        <button type="button" className={styles.primaryBtn} disabled={cta.disabled} onClick={onSupport}>
          {cta.label}
        </button>
        <span className={styles.inlineMuted}>Ủng hộ campaign theo reward và phương thức thanh toán.</span>
      </div>
    </section>
  );
}

export function MissionsSection({ missions }: { missions: CampaignDetailDTO["missions"] }) {
  return (
    <section className={styles.panel}>
      <h2 className={styles.sectionTitle}>Missions</h2>
      <div className={styles.grid}>
        {missions.map((mission) => (
          <article key={mission.id} className={styles.rewardCard}>
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
    <section className={styles.panel}>
      <h2 className={styles.sectionTitle}>Mốc thời gian</h2>
      <p>Tạo campaign: {formatDateTime(timeline.createdAt)}</p>
      <p>Duyệt campaign: {formatDateTime(timeline.approvedAt)}</p>
      <div className={styles.grid}>
        {timeline.milestoneUpdates.map((item, index) => (
          <article key={`${item.at}-${index}`} className={styles.rewardCard}>
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
    <section className={styles.panel}>
      <h2 className={styles.sectionTitle}>Backers & social proof</h2>
      <p>Tổng người ủng hộ: {socialProof.totalBackers}</p>
      <div className={styles.grid}>
        {socialProof.recentContributions.map((contribution) => (
          <article key={contribution.id} className={styles.rewardCard}>
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
    <section className={styles.panel}>
      <h2 className={styles.sectionTitle}>FAQ/Chính sách</h2>
      <p>Chính sách reward: {faqPolicy.rewardPolicy}</p>
      <p>Chính sách hoàn tiền: {faqPolicy.refundPolicy}</p>
      <p>Cách dùng voucher: {faqPolicy.voucherUsage}</p>
      <p>Chính sách khi campaign thất bại: {faqPolicy.campaignFailurePolicy}</p>
    </section>
  );
}
