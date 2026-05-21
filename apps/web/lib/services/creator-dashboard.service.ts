import { MissionLifecycleStatus } from "@prisma/client";
import { prisma } from "@/lib/db";
import { AppError } from "@/lib/errors";
import { acceptMission, submitMissionProof } from "@/lib/services/mission.service";
import { createCreatorPayoutRequest, ensureWalletByAccountId } from "@/lib/services/wallet.service";
import { getCreatorKpis } from "@/lib/services/analytics.service";
import type { CreatorChannelsUpdateInput, CreatorProfileUpdateInput } from "@/lib/validators/creator-dashboard";

function toJobStatus(status: MissionLifecycleStatus) {
  if (status === "ACCEPTED") return "accepted";
  if (status === "DOING") return "in_progress";
  if (status === "PENDING_REVIEW" || status === "SUBMITTED") return "submitted";
  if (status === "APPROVED" || status === "DONE") return "approved";
  if (status === "REJECTED") return "rejected";
  return "in_progress";
}

function parseProfileMeta(value: unknown): {
  categories: string[];
  socialLinks: Array<{ label: string; url: string }>;
  channels: Array<{ platform: string; url: string; followerCount: number; isVerified: boolean }>;
  kycVerified: boolean;
} {
  const fallback = { categories: [], socialLinks: [], channels: [], kycVerified: false };
  if (!value || typeof value !== "object") return fallback;

  const source = value as Record<string, unknown>;
  const categories = Array.isArray(source.categories)
    ? source.categories.filter((item): item is string => typeof item === "string")
    : [];
  const socialLinks = Array.isArray(source.socialLinks)
    ? source.socialLinks.filter(
        (item): item is { label: string; url: string } =>
          Boolean(item && typeof item === "object" && typeof (item as { label?: unknown }).label === "string" && typeof (item as { url?: unknown }).url === "string")
      )
    : [];
  const channels = Array.isArray(source.channels)
    ? source.channels.filter(
        (item): item is { platform: string; url: string; followerCount: number; isVerified: boolean } =>
          Boolean(
            item &&
              typeof item === "object" &&
              typeof (item as { platform?: unknown }).platform === "string" &&
              typeof (item as { url?: unknown }).url === "string" &&
              typeof (item as { followerCount?: unknown }).followerCount === "number" &&
              typeof (item as { isVerified?: unknown }).isVerified === "boolean"
          )
      )
    : [];

  const kycVerified = source.kycVerified === true;

  return { categories, socialLinks, channels, kycVerified };
}

export async function getCreatorDashboardOverview(accountId: string) {
  const wallet = await ensureWalletByAccountId(accountId);
  const [totalJobs, pendingProofs, approvedVideos, totalCommission] = await prisma.$transaction([
    prisma.missionSubmission.count({ where: { accountId } }),
    prisma.missionSubmission.count({ where: { accountId, lifecycleStatus: "PENDING_REVIEW" } }),
    prisma.missionSubmission.count({ where: { accountId, lifecycleStatus: { in: ["APPROVED", "DONE"] } } }),
    prisma.walletTransaction.aggregate({
      _sum: { cashDeltaVnd: true },
      where: { accountId, type: "COMMISSION_CREDIT" }
    })
  ]);

  return {
    totalJobs,
    pendingProofs,
    approvedVideos,
    totalCommission: totalCommission._sum.cashDeltaVnd ?? 0,
    availablePayoutBalance: wallet.cashBalanceVnd
  };
}

export async function listCreatorMarketplaceJobs(accountId: string) {
  const acceptedMissionIds = await prisma.missionSubmission.findMany({
    where: { accountId },
    select: { missionId: true }
  });

  return prisma.mission.findMany({
    where: {
      audience: "CREATOR",
      status: "OPEN",
      id: { notIn: acceptedMissionIds.map((item) => item.missionId) }
    },
    orderBy: { createdAt: "desc" },
    include: { campaign: { select: { id: true, title: true, slug: true, category: true } } }
  });
}

export async function acceptCreatorMarketplaceJob(missionId: string, accountId: string) {
  return acceptMission(missionId, accountId, "CREATOR");
}

export async function listCreatorMyJobs(accountId: string) {
  const submissions = await prisma.missionSubmission.findMany({
    where: { accountId },
    orderBy: { updatedAt: "desc" },
    include: { mission: { include: { campaign: { select: { id: true, title: true, slug: true } } } } }
  });

  return submissions.map((item) => ({
    id: item.id,
    missionId: item.missionId,
    title: item.mission.title,
    campaign: item.mission.campaign,
    lifecycleStatus: item.lifecycleStatus,
    statusGroup: toJobStatus(item.lifecycleStatus),
    rejectReason: item.rejectReason,
    rewardCommissionVnd: item.mission.rewardCommissionVnd,
    updatedAt: item.updatedAt
  }));
}

export async function submitCreatorProof(
  submissionId: string,
  accountId: string,
  payload: { videoUrl: string; screenshotUrl?: string; note?: string }
) {
  return submitMissionProof(submissionId, accountId, {
    videoUrl: payload.videoUrl,
    screenshotUrl: payload.screenshotUrl,
    note: payload.note
  });
}

export async function getCreatorCommission(accountId: string) {
  const [submissions, payoutRequests] = await prisma.$transaction([
    prisma.missionSubmission.findMany({
      where: { accountId },
      include: { mission: { select: { id: true, title: true, rewardCommissionVnd: true } } },
      orderBy: { createdAt: "desc" }
    }),
    prisma.payoutRequest.findMany({ where: { accountId }, orderBy: { createdAt: "desc" }, take: 20 })
  ]);

  const lines = submissions.map((item) => ({
    submissionId: item.id,
    missionId: item.missionId,
    missionTitle: item.mission.title,
    fixedFeeVnd: item.mission.rewardCommissionVnd,
    salesCommissionVnd: 0,
    payoutStatus: item.rewardGrantedAt ? "credited" : "pending"
  }));

  return { lines, payoutRequests };
}

export async function getCreatorProfile(accountId: string) {
  const account = await prisma.account.findUniqueOrThrow({
    where: { id: accountId },
    include: { profile: true }
  });

  const profileMeta = parseProfileMeta(account.profile?.socialLinks);

  return {
    displayName: account.displayName,
    avatarUrl: account.avatarUrl,
    bio: account.profile?.bio ?? "",
    categories: profileMeta.categories,
    socialLinks: profileMeta.socialLinks
  };
}

export async function updateCreatorProfile(accountId: string, input: CreatorProfileUpdateInput) {
  const current = await prisma.profile.findUnique({ where: { accountId } });
  const currentMeta = parseProfileMeta(current?.socialLinks);

  await prisma.account.update({
    where: { id: accountId },
    data: {
      displayName: input.displayName,
      avatarUrl: input.avatarUrl || null
    }
  });

  await prisma.profile.upsert({
    where: { accountId },
    create: {
      accountId,
      bio: input.bio,
      socialLinks: {
        categories: input.categories,
        socialLinks: input.socialLinks,
        channels: currentMeta.channels,
        kycVerified: currentMeta.kycVerified
      }
    },
    update: {
      bio: input.bio,
      socialLinks: {
        categories: input.categories,
        socialLinks: input.socialLinks,
        channels: currentMeta.channels,
        kycVerified: currentMeta.kycVerified
      }
    }
  });

  return getCreatorProfile(accountId);
}

export async function getCreatorChannels(accountId: string) {
  const profile = await prisma.profile.findUnique({ where: { accountId } });
  const profileMeta = parseProfileMeta(profile?.socialLinks);
  return { channels: profileMeta.channels };
}

export async function updateCreatorChannels(accountId: string, input: CreatorChannelsUpdateInput) {
  const current = await prisma.profile.findUnique({ where: { accountId } });
  const currentMeta = parseProfileMeta(current?.socialLinks);

  await prisma.profile.upsert({
    where: { accountId },
    create: {
      accountId,
      socialLinks: {
        categories: currentMeta.categories,
        socialLinks: currentMeta.socialLinks,
        channels: input.channels,
        kycVerified: currentMeta.kycVerified
      }
    },
    update: {
      socialLinks: {
        categories: currentMeta.categories,
        socialLinks: currentMeta.socialLinks,
        channels: input.channels,
        kycVerified: currentMeta.kycVerified
      }
    }
  });

  return { channels: input.channels };
}

export async function getCreatorPortfolio(accountId: string) {
  const approvedContent = await prisma.missionSubmission.findMany({
    where: { accountId, lifecycleStatus: { in: ["APPROVED", "DONE"] } },
    orderBy: { approvedAt: "desc" },
    include: { mission: { include: { campaign: { select: { id: true, title: true, slug: true } } } } }
  });

  const campaignHistory = await prisma.missionSubmission.findMany({
    where: { accountId },
    orderBy: { createdAt: "desc" },
    include: { mission: { include: { campaign: { select: { id: true, title: true, slug: true } } } } }
  });

  return { approvedContent, campaignHistory };
}

export async function getCreatorPayoutData(accountId: string) {
  const wallet = await ensureWalletByAccountId(accountId);
  const history = await prisma.payoutRequest.findMany({ where: { accountId }, orderBy: { createdAt: "desc" } });
  return { availableBalanceVnd: wallet.cashBalanceVnd, history };
}

export async function createCreatorPayoutWithKyc(
  accountId: string,
  amountVnd: number,
  note: string | undefined,
  idempotencyKey: string
) {
  const profile = await prisma.profile.findUnique({ where: { accountId } });
  const profileMeta = parseProfileMeta(profile?.socialLinks);
  // eslint-disable-next-line turbo/no-undeclared-env-vars
  const requiresKyc = process.env.CREATOR_PAYOUT_KYC_REQUIRED === "true";

  if (requiresKyc && !profileMeta.kycVerified) {
    throw new AppError("KYC or identity verification is required before payout", 403, "KYC_REQUIRED");
  }

  return createCreatorPayoutRequest(accountId, amountVnd, note, idempotencyKey);
}

export async function getCreatorAnalyticsKpis(accountId: string) {
  return getCreatorKpis(accountId);
}
