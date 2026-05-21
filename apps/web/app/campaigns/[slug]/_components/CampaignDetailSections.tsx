import type { CampaignDetailDTO } from "@/lib/dto/campaign-detail";
import styles from "../campaign-detail.module.css";
import { formatCurrencyVnd, formatDateTime } from "./campaign-detail.utils";

type CTA = { label: string; disabled: boolean };

export function HeroSection({ hero }: { hero: CampaignDetailDTO["hero"] }) {
  return (
    <section className="card">
      {hero.coverMediaType === "video" && hero.coverMediaUrl ? (
        <video className={styles.heroMedia} src={hero.coverMediaUrl} controls />
      ) : (
        <img className={styles.heroMedia} src={hero.coverMediaUrl ?? "/globe.svg"} alt={hero.title} />
      )}
      <h1>{hero.title}</h1>
      <p>{hero.description}</p>
      <div className={styles.meta}>
        <span className={styles.chip}>Brand: {hero.brand}</span>
        <span className={styles.chip}>Creator: {hero.creator ?? "N/A"}</span>
        <span className={styles.chip}>Type: {hero.campaignType}</span>
        <span className={styles.chip}>Status: {hero.status}</span>
        <span className={styles.chip}>Deadline: {formatDateTime(hero.deadline)}</span>
      </div>
    </section>
  );
}

export function FundingSection({ funding }: { funding: CampaignDetailDTO["funding"] }) {
  return (
    <section className="card">
      <h2>Funding</h2>
      <p>Target: {formatCurrencyVnd(funding.targetAmountVnd)}</p>
      <p>Funded: {formatCurrencyVnd(funding.fundedAmountVnd)}</p>
      <div className={styles.progressTrack}>
        <div className={styles.progressBar} style={{ width: `${funding.progressPercent}%` }} />
      </div>
      <p>{funding.progressPercent}%</p>
      <p>Backers: {funding.backerCount}</p>
      <p>Remaining: {funding.remainingTimeLabel}</p>
    </section>
  );
}

export function RewardsSection({
  rewards,
  selectedRewardId,
  onSelect,
  cta
}: {
  rewards: CampaignDetailDTO["rewards"];
  selectedRewardId: string | null;
  onSelect: (id: string) => void;
  cta: CTA;
}) {
  return (
    <section className="card">
      <h2>Reward tiers</h2>
      <div className={styles.grid}>
        {rewards.map((reward) => {
          const selected = reward.id === selectedRewardId;
          return (
            <article
              key={reward.id}
              className={`${styles.rewardCard} ${selected ? styles.rewardCardSelected : ""}`}
            >
              <h3>{reward.title}</h3>
              <p>{reward.description}</p>
              <p>
                Gia: {reward.priceVnd ? formatCurrencyVnd(reward.priceVnd) : `${reward.pricePoints} points`}
              </p>
              <p>
                Stock: {reward.stockRemaining}/{reward.stockTotal}
              </p>
              <p>Estimated delivery: {reward.estimatedDelivery}</p>
              <div className={styles.actions}>
                <button type="button" onClick={() => onSelect(reward.id)} disabled={reward.isOutOfStock}>
                  Chon reward
                </button>
              </div>
            </article>
          );
        })}
      </div>
      <div className={styles.actions}>
        <button type="button" disabled={cta.disabled}>
          {cta.label}
        </button>
        <span className={styles.inlineMuted}>SupportModal/ContributionModal se mo o buoc tiep theo.</span>
      </div>
    </section>
  );
}

export function MissionsSection({ missions }: { missions: CampaignDetailDTO["missions"] }) {
  return (
    <section className="card">
      <h2>Missions</h2>
      <div className={styles.grid}>
        {missions.map((mission) => (
          <article key={mission.id} className={styles.rewardCard}>
            <h3>{mission.title}</h3>
            <p>Reward points: {mission.rewardPoints}</p>
            <p>Deadline: {formatDateTime(mission.deadline)}</p>
            <p>Eligibility: {mission.eligibility}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

export function TimelineSection({ timeline }: { timeline: CampaignDetailDTO["timeline"] }) {
  return (
    <section className="card">
      <h2>Timeline</h2>
      <p>Campaign created: {formatDateTime(timeline.createdAt)}</p>
      <p>Campaign approved: {formatDateTime(timeline.approvedAt)}</p>
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
    <section className="card">
      <h2>Backers & social proof</h2>
      <p>Tong nguoi ung ho: {socialProof.totalBackers}</p>
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
    <section className="card">
      <h2>FAQ/Policy</h2>
      <p>Reward policy: {faqPolicy.rewardPolicy}</p>
      <p>Refund policy: {faqPolicy.refundPolicy}</p>
      <p>Voucher usage: {faqPolicy.voucherUsage}</p>
      <p>Campaign failure policy: {faqPolicy.campaignFailurePolicy}</p>
    </section>
  );
}
