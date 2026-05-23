import Link from "next/link";
import Image from "next/image";
import styles from "../campaigns.module.css";
import { CreatorCampaignApplyButton } from "./CreatorCampaignApplyButton";

export type CampaignCardData = {
  slug: string;
  title: string;
  coverImageUrl: string | null;
  brand: string;
  creator: string | null;
  campaignType: string;
  fundedAmount: number;
  targetAmount: number;
  progressPercent: number;
  backers: number;
  rewardsLeft: number;
  deadline: string | Date | null;
};

export function CampaignCard({ campaign }: { campaign: CampaignCardData }) {
  return (
    <article className={styles.card}>
      <Image
        className={styles.cover}
        src={campaign.coverImageUrl ?? "https://images.unsplash.com/photo-1557804506-669a67965ba0?w=1200"}
        alt={campaign.title}
        width={1200}
        height={675}
      />
      <div className={styles.cardBody}>
        <h3>{campaign.title}</h3>
        <p className={styles.meta}>Brand: {campaign.brand}</p>
        <p className={styles.meta}>Creator: {campaign.creator ?? "N/A"}</p>
        <p className={styles.meta}>Type: {campaign.campaignType}</p>
        <p className={styles.meta}>
          Funded: {campaign.fundedAmount.toLocaleString("vi-VN")} / {campaign.targetAmount.toLocaleString("vi-VN")} VND
        </p>
        <div className={styles.barWrap}>
          <div className={styles.bar} style={{ width: `${campaign.progressPercent}%` }} />
        </div>
        <p className={styles.meta}>Backers: {campaign.backers}</p>
        <p className={styles.meta}>Rewards left: {campaign.rewardsLeft}</p>
        <p className={styles.meta}>
          Deadline: {campaign.deadline ? new Date(campaign.deadline).toLocaleDateString("vi-VN") : "N/A"}
        </p>
        <Link href={`/campaigns/${campaign.slug}`} className={styles.cta}>
          Ủng hộ
        </Link>
        <CreatorCampaignApplyButton slug={campaign.slug} compact />
      </div>
    </article>
  );
}
