"use client";

import { useEffect, useMemo, useState } from "react";
import type { CampaignDetailDTO } from "@/lib/dto/campaign-detail";
import styles from "../campaign-detail.module.css";
import {
  BackersSection,
  CampaignStatsSection,
  FaqPolicySection,
  FundingSection,
  HeroSection,
  MissionsSection,
  RewardsSection,
  TimelineSection
} from "./CampaignDetailSections";
import { CreatorCampaignApplyButton } from "@/app/campaigns/_components/CreatorCampaignApplyButton";
import { SupportModal } from "./SupportModal";

type Props = { slug: string };

type ApiResponse = {
  success: boolean;
  data?: CampaignDetailDTO;
  error?: string;
  code?: string;
};

function getCampaignCTA(data: CampaignDetailDTO, selectedRewardId: string | null) {
  if (data.viewer.hasSupported) {
    return { label: "Nhận voucher", disabled: false };
  }
  if (data.funding.isEnded) {
    return { label: "Campaign da ket thuc", disabled: true };
  }
  if (!selectedRewardId) {
    return data.viewer.isLoggedIn
      ? { label: "Ủng hộ", disabled: true }
      : { label: "Đăng nhập để ủng hộ", disabled: false };
  }
  const selectedReward = data.rewards.find((reward) => reward.id === selectedRewardId);
  if (!selectedReward || selectedReward.isOutOfStock) {
    return { label: "Het luot", disabled: true };
  }
  if (!data.viewer.isLoggedIn) {
    return { label: "Đăng nhập để ủng hộ", disabled: false };
  }
  return { label: "Ủng hộ", disabled: false };
}

export function CampaignDetailContainer({ slug }: Props) {
  const [data, setData] = useState<CampaignDetailDTO | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isNotFound, setIsNotFound] = useState(false);
  const [selectedRewardId, setSelectedRewardId] = useState<string | null>(null);
  const [isSupportOpen, setIsSupportOpen] = useState(false);

  useEffect(() => {
    let active = true;
    const run = async () => {
      setLoading(true);
      setError(null);
      setIsNotFound(false);
      try {
        const response = await fetch(`/api/campaigns/${slug}`, { cache: "no-store" });
        const body = (await response.json()) as ApiResponse;
        if (!active) return;

        if (!response.ok) {
          if (response.status === 404 || body.code === "CAMPAIGN_NOT_FOUND") {
            setIsNotFound(true);
            return;
          }
          throw new Error(body.error ?? "Load campaign detail failed");
        }

        if (!body.success || !body.data) {
          throw new Error(body.error ?? "Unexpected response");
        }

        setData(body.data);
        setSelectedRewardId((prev) => {
          if (prev && body.data?.rewards.some((reward) => reward.id === prev)) return prev;
          return body.data?.rewards.find((reward) => !reward.isOutOfStock)?.id ?? null;
        });
      } catch (err) {
        if (!active) return;
        setError(err instanceof Error ? err.message : "Cannot load campaign detail");
      } finally {
        if (active) setLoading(false);
      }
    };

    void run();
    return () => {
      active = false;
    };
  }, [slug]);

  const cta = useMemo(
    () => (data ? getCampaignCTA(data, selectedRewardId) : { label: "Ủng hộ", disabled: true }),
    [data, selectedRewardId]
  );

  if (loading) {
    return (
      <main className={`container ${styles.page}`}>
        <div className={styles.skeleton} />
        <div className={styles.skeleton} />
        <div className={styles.skeleton} />
      </main>
    );
  }

  if (isNotFound) {
    return (
      <main className="container">
        <h1>Campaign khong ton tai</h1>
        <p>Campaign co the chua public hoac da bi go.</p>
      </main>
    );
  }

  if (error || !data) {
    return (
      <main className="container">
        <h1>Loi tai campaign detail</h1>
        <p className="error">{error ?? "Khong the tai du lieu."}</p>
      </main>
    );
  }

  return (
    <main className={`container ${styles.page}`}>
      <div className={styles.leftColumn}>
        <HeroSection hero={data.hero} />
        <div className={styles.full}>
          <CampaignStatsSection data={data} />
          <MissionsSection missions={data.missions} />
          <TimelineSection timeline={data.timeline} />
          <BackersSection socialProof={data.socialProof} />
          <FaqPolicySection faqPolicy={data.faqPolicy} />
        </div>
      </div>
      <div className={styles.rightColumn}>
        <FundingSection funding={data.funding} />
        <section className={styles.panel}>
          <h2 className={styles.sectionTitle}>Đăng ký chiến dịch Creator</h2>
          <p className={styles.inlineMuted}>Nộp đơn để Brand/Admin duyệt trước khi nhận nhiệm vụ.</p>
          <CreatorCampaignApplyButton slug={data.hero.slug} />
        </section>
        <RewardsSection
          campaignTitle={data.hero.title}
          rewards={data.rewards}
          selectedRewardId={selectedRewardId}
          onSelect={setSelectedRewardId}
          cta={cta}
          onSupport={() => {
            if (data.viewer.hasSupported) {
              window.location.href = "/vouchers";
              return;
            }
            setIsSupportOpen(true);
          }}
        />
        <SupportModal
          open={isSupportOpen}
          onClose={() => setIsSupportOpen(false)}
          campaignId={data.hero.id}
          campaignSlug={data.hero.slug}
          rewards={data.rewards}
          initialRewardId={selectedRewardId}
        />
      </div>
    </main>
  );
}
