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
        <div className={styles.row}>
          <span className={styles.badge}>Đang mở</span>
          <span className={styles.badgeMuted}>{campaign.campaignType}</span>
        </div>
        <h3 className={styles.title}>{campaign.title}</h3>
        <p className={styles.meta}>Thương hiệu: {campaign.brand}</p>
        <p className={styles.meta}>Creator: {campaign.creator ?? "Chưa chỉ định"}</p>
        <p className={styles.meta}>
          Đã ủng hộ: {campaign.fundedAmount.toLocaleString("vi-VN")} / {campaign.targetAmount.toLocaleString("vi-VN")} VND
        </p>
        <div className={styles.barWrap}>
          <div className={styles.bar} style={{ width: `${campaign.progressPercent}%` }} />
        </div>
        <p className={styles.meta}>Backer: {campaign.backers}</p>
        <p className={styles.meta}>Reward còn lại: {campaign.rewardsLeft}</p>
        <p className={styles.meta}>
          Hạn chót: {campaign.deadline ? new Date(campaign.deadline).toLocaleDateString("vi-VN") : "Không giới hạn"}
        </p>
        <div className={styles.actionRow}>
          <Link href={`/campaigns/${campaign.slug}`} className={styles.cta}>
            Chọn reward
          </Link>
          <CreatorCampaignApplyButton slug={campaign.slug} compact />
        </div>
      </div>
    </article>
  );
}
