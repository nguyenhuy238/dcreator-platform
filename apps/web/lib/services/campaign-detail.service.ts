import type { CampaignDetailDTO } from "@/lib/dto/campaign-detail";
import { AppError } from "@/lib/errors";
import { findPublicCampaignDetailBySlug } from "@/lib/repositories/campaign-detail.repository";

function maskDisplayName(name: string) {
  const trimmed = name.trim();
  if (trimmed.length <= 1) return "*";
  if (trimmed.length === 2) return `${trimmed[0]}*`;
  return `${trimmed[0]}${"*".repeat(trimmed.length - 2)}${trimmed.at(-1)}`;
}

function formatRemainingTime(endsAt: Date | null) {
  if (!endsAt) return "Khong gioi han";
  const diff = endsAt.getTime() - Date.now();
  if (diff <= 0) return "Da ket thuc";
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const days = Math.floor(hours / 24);
  if (days > 0) return `${days} ngay con lai`;
  return `${Math.max(1, hours)} gio con lai`;
}

function isVideoUrl(url: string | null) {
  if (!url) return false;
  return /\.(mp4|webm|mov)$/i.test(url);
}

function parseRoadmap(value: string | null): string[] {
  return (value ?? "")
    .split(/\r?\n/)
    .map((step) => step.trim())
    .filter(Boolean);
}

export async function getCampaignDetailBySlug(slug: string, viewerId?: string): Promise<CampaignDetailDTO> {
  const result = await findPublicCampaignDetailBySlug(slug, viewerId);
  if (!result) {
    throw new AppError("Campaign not found or not public", 404, "CAMPAIGN_NOT_FOUND");
  }

  const { campaign, viewerHasSupported } = result;
  const distinctBackers = new Set(campaign.contributions.map((item) => item.supporterId)).size;
  const progressPercent =
    campaign.targetAmountVnd > 0
      ? Math.min(100, Math.round((campaign.fundedAmountVnd / campaign.targetAmountVnd) * 100))
      : 0;
  const now = Date.now();
  const isEnded = Boolean(campaign.endsAt && campaign.endsAt.getTime() <= now);
  const creatorJoined = new Set(campaign.missionApplications.map((item) => item.accountId)).size;
  const approvedVideos = Math.max(0, campaign.ugcVideoApprovedCount ?? 0);
  const targetVideos = Math.max(0, campaign.ugcVideoQuota ?? 0);
  const completionPercent = targetVideos > 0 ? Math.min(100, Math.round((approvedVideos / targetVideos) * 100)) : 0;
  const remainingSlots = targetVideos > 0 ? Math.max(0, targetVideos - approvedVideos) : 0;
  const isQuotaReached = targetVideos > 0 && remainingSlots <= 0;

  return {
    hero: {
      id: campaign.id,
      slug: campaign.slug,
      title: campaign.title,
      description: campaign.brief,
      coverMediaUrl: campaign.coverImageUrl,
      coverMediaType: isVideoUrl(campaign.coverImageUrl) ? "video" : "image",
      brand: campaign.brand.displayName,
      creator: campaign.creator?.displayName ?? null,
      campaignType: campaign.campaignType,
      category: campaign.category,
      objective: campaign.objective,
      benefits: campaign.objective,
      participationRoadmap: parseRoadmap(campaign.priorityChannels),
      status: campaign.status,
      deadline: campaign.endsAt?.toISOString() ?? null
    },
    funding: {
      targetAmountVnd: campaign.targetAmountVnd,
      fundedAmountVnd: campaign.fundedAmountVnd,
      progressPercent,
      backerCount: distinctBackers,
      remainingTimeLabel: formatRemainingTime(campaign.endsAt),
      isEnded
    },
    videoStats: {
      targetVideos,
      approvedVideos,
      creatorJoined,
      remainingSlots,
      completionPercent,
      isQuotaReached
    },
    rewards: campaign.rewards.map((reward) => ({
      id: reward.id,
      title: reward.title,
      description: reward.description ?? `Nhan voucher ${reward.title} khi ung ho campaign.`,
      pricePoints: reward.pointsCost,
      priceVnd: null,
      stockTotal: reward.stockTotal,
      stockRemaining: reward.stockRemaining,
      estimatedDelivery: reward.estimatedDeliveryAt?.toISOString() ?? "Trong 7-14 ngay sau khi campaign ket thuc",
      isOutOfStock: reward.stockRemaining <= 0
    })),
    missions: campaign.missions.map((mission) => ({
      id: mission.id,
      title: mission.title,
      rewardPoints: mission.rewardPoints,
      deadline: campaign.endsAt?.toISOString() ?? null,
      eligibility: "Creator da KYC va du dieu kien tham gia mission",
      status: mission.status
    })),
    timeline: {
      createdAt: campaign.createdAt.toISOString(),
      approvedAt: campaign.startsAt?.toISOString() ?? null,
      milestoneUpdates: campaign.missions.slice(0, 5).map((mission) => ({
        label: `Mission cap nhat: ${mission.title}`,
        at: mission.createdAt.toISOString()
      }))
    },
    socialProof: {
      totalBackers: distinctBackers,
      recentContributions: campaign.contributions.slice(0, 10).map((item) => ({
        id: item.id,
        supporterMasked: maskDisplayName(item.supporter.displayName),
        amountVnd: item.amountVnd,
        contributedAt: item.createdAt.toISOString()
      }))
    },
    faqPolicy: {
      rewardPolicy: "Reward duoc cap theo tier da chon va so luong con lai.",
      refundPolicy: "Dong gop da xac nhan khong hoan lai, tru loi he thong.",
      voucherUsage: "Voucher ap dung 1 lan, khong quy doi tien mat.",
      campaignFailurePolicy: "Neu campaign that bai, he thong se xu ly theo chinh sach doi tac."
    },
    viewer: {
      isLoggedIn: Boolean(viewerId),
      hasSupported: viewerHasSupported
    }
  };
}
