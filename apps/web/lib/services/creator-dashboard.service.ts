import { MissionLifecycleStatus, SocialPlatform } from "@prisma/client";
import { prisma } from "@/lib/db";
import { AppError } from "@/lib/errors";
import { acceptMission, submitMissionProof } from "@/lib/services/mission.service";
import { createNotification, createNotificationForAdminOps } from "@/lib/services/notification.service";
import { createCreatorPayoutRequest, ensureWalletByAccountId } from "@/lib/services/wallet.service";
import { getCreatorKpis } from "@/lib/services/analytics.service";
import { writeAuditLog } from "@/lib/services/audit-log.service";
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

function toSocialPlatform(platform: string): SocialPlatform {
  const normalized = platform.trim().toLowerCase();
  if (normalized === "tiktok") return "TIKTOK";
  if (normalized === "instagram") return "INSTAGRAM";
  if (normalized === "youtube") return "YOUTUBE";
  if (normalized === "facebook") return "FACEBOOK";
  if (normalized === "shopee") return "SHOPEE";
  return "OTHER";
}

function fromSocialPlatform(platform: SocialPlatform): "TikTok" | "Instagram" | "YouTube" | "Facebook" | "Shopee" | "Other" {
  if (platform === "TIKTOK") return "TikTok";
  if (platform === "INSTAGRAM") return "Instagram";
  if (platform === "YOUTUBE") return "YouTube";
  if (platform === "FACEBOOK") return "Facebook";
  if (platform === "SHOPEE") return "Shopee";
  return "Other";
}

function normalizeHandle(handle: string) {
  return handle.trim().replace(/^@+/, "").toLowerCase();
}

function validatePlatformUrl(platform: SocialPlatform, url: string) {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new AppError("URL kênh không hợp lệ", 422, "CHANNEL_URL_INVALID");
  }
  const host = parsed.hostname.toLowerCase();
  const checks: Record<SocialPlatform, string[]> = {
    TIKTOK: ["tiktok.com"],
    INSTAGRAM: ["instagram.com"],
    YOUTUBE: ["youtube.com", "youtu.be"],
    FACEBOOK: ["facebook.com", "fb.com"],
    SHOPEE: ["shopee.vn", "shopee.com"],
    OTHER: []
  };
  const expectedHosts = checks[platform];
  if (expectedHosts.length > 0 && !expectedHosts.some((allowed) => host.includes(allowed))) {
    throw new AppError(`URL không đúng nền tảng ${platform}`, 422, "CHANNEL_URL_PLATFORM_MISMATCH");
  }
}

async function ensureCreatorProfileForSocialLink(accountId: string) {
  const existing = await prisma.creatorProfile.findUnique({ where: { accountId } });
  if (existing) return existing;

  const account = await prisma.account.findUniqueOrThrow({
    where: { id: accountId },
    select: {
      displayName: true,
      avatarUrl: true,
      profile: { select: { bio: true, phone: true } }
    }
  });

  return prisma.creatorProfile.create({
    data: {
      accountId,
      displayName: account.displayName,
      avatarUrl: account.avatarUrl,
      bio: account.profile?.bio ?? null,
      phone: account.profile?.phone ?? null
    }
  });
}

export async function getCreatorDashboardOverview(accountId: string) {
  const wallet = await ensureWalletByAccountId(accountId);
  const [totalJobs, pendingProofs, approvedVideos, completedSubmissions] = await prisma.$transaction([
    prisma.missionSubmission.count({ where: { accountId } }),
    prisma.missionSubmission.count({ where: { accountId, lifecycleStatus: "PENDING_REVIEW" } }),
    prisma.missionSubmission.count({ where: { accountId, lifecycleStatus: { in: ["APPROVED", "DONE"] } } }),
    prisma.missionSubmission.findMany({
      where: { accountId, lifecycleStatus: "DONE" },
      select: { mission: { select: { rewardPoints: true } } }
    })
  ]);

  const totalCommission = completedSubmissions.reduce(
    (sum, item) => sum + (item.mission.rewardPoints ?? 0),
    0
  );

  return {
    totalJobs,
    pendingProofs,
    approvedVideos,
    totalCommission,
    nPointsBalance: wallet.pointsBalance
  };
}

export async function listCreatorMarketplaceJobs(
  accountId: string,
  filters?: {
    category?: "TECH" | "FASHION" | "FOOD" | "BEAUTY" | "LIFESTYLE" | "EDUCATION";
    campaignStatus?: "ACTIVE" | "PAUSED" | "COMPLETED";
    minRewardPoints?: number;
    minPayoutVnd?: number;
    deadlineBefore?: string;
    search?: string;
  }
) {
  const acceptedMissionIds = await prisma.missionSubmission.findMany({
    where: { accountId },
    select: { missionId: true }
  });

  return prisma.mission.findMany({
    where: {
      audience: "CREATOR",
      status: "OPEN",
      id: { notIn: acceptedMissionIds.map((item) => item.missionId) },
      ...(typeof filters?.minRewardPoints === "number" ? { rewardPoints: { gte: filters.minRewardPoints } } : {}),
      ...(typeof filters?.minPayoutVnd === "number" ? { rewardCommissionVnd: { gte: filters.minPayoutVnd } } : {}),
      ...(filters?.deadlineBefore
        ? { deadlineAt: { lte: new Date(filters.deadlineBefore) } }
        : {}),
      ...(filters?.search
        ? {
            OR: [
              { title: { contains: filters.search, mode: "insensitive" } },
              { description: { contains: filters.search, mode: "insensitive" } },
              { campaign: { title: { contains: filters.search, mode: "insensitive" } } }
            ]
          }
        : {}),
      campaign: {
        ...(filters?.category ? { category: filters.category } : {}),
        ...(filters?.campaignStatus ? { status: filters.campaignStatus } : {})
      }
    },
    orderBy: { createdAt: "desc" },
    include: { campaign: { select: { id: true, title: true, slug: true, category: true, status: true, endsAt: true } } }
  });
}

export async function acceptCreatorMarketplaceJob(missionId: string, accountId: string) {
  return acceptMission(missionId, accountId, ["CREATOR"]);
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
  payload: { videoUrl: string; screenshotUrl?: string; platform?: "TikTok" | "Instagram" | "YouTube" | "Facebook"; adCode?: string; note?: string }
) {
  const updated = await submitMissionProof(submissionId, accountId, {
    videoUrl: payload.videoUrl,
    screenshotUrl: payload.screenshotUrl,
    proofTextNote: payload.adCode,
    note: [payload.platform ? `Platform: ${payload.platform}` : "", payload.note ?? ""].filter(Boolean).join(" | ")
  });

  await writeAuditLog({
    actorId: accountId,
    action: "CREATOR_PROOF_SUBMITTED",
    targetType: "MissionSubmission",
    targetId: updated.id,
    metadata: { platform: payload.platform ?? null, adCode: payload.adCode ?? null }
  });
  await createNotificationForAdminOps({
    event: "PROOF_SUBMITTED",
    title: "Creator đã nộp proof",
    content: `Creator vừa nộp proof cho mission submission ${updated.id}.`,
    metadata: { submissionId: updated.id, accountId },
    excludeAccountId: accountId
  });
  return updated;
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

  await createNotification({
    accountId,
    event: "CREATOR_APPLICATION_APPROVED",
    title: "Đã cập nhật hồ sơ Creator",
    content: "Thông tin hồ sơ Creator của bạn đã được lưu thành công.",
    metadata: { source: "creator-profile" }
  });

  return getCreatorProfile(accountId);
}

export async function getCreatorChannels(accountId: string) {
  const creatorProfile = await prisma.creatorProfile.findUnique({
    where: { accountId },
    include: {
      socialLinks: {
        orderBy: [{ createdAt: "desc" }]
      }
    }
  });

  return {
    creatorProfile: creatorProfile
      ? {
          id: creatorProfile.id,
          displayName: creatorProfile.displayName,
          mainPlatform: creatorProfile.mainPlatform,
          socialUrl: creatorProfile.socialUrl,
          followerCount: creatorProfile.followerCount
        }
      : null,
    channels: creatorProfile
      ? creatorProfile.socialLinks.map((item) => ({
          id: item.id,
          platform: fromSocialPlatform(item.platform),
          handle: item.handle ?? "",
          url: item.socialUrl,
          followerCount: item.followers,
          engagementRate: item.engagementRate ?? null,
          isActive: item.isActive,
          verificationStatus: item.verificationStatus,
          status: item.status,
          rejectReason: item.rejectReason,
          createdAt: item.createdAt
        }))
      : []
  };
}

export async function createCreatorChannel(accountId: string, input: CreatorChannelsUpdateInput) {
  const creatorProfile = await ensureCreatorProfileForSocialLink(accountId);
  const platform = toSocialPlatform(input.platform);
  const handle = normalizeHandle(input.handle);
  validatePlatformUrl(platform, input.url);

  const duplicate = await prisma.creatorSocialLink.findFirst({
    where: {
      creatorProfileId: creatorProfile.id,
      platform,
      handle
    },
    select: { id: true }
  });
  if (duplicate) {
    throw new AppError("Kênh trùng platform + handle", 409, "CHANNEL_DUPLICATE_HANDLE");
  }

  try {
    await prisma.creatorSocialLink.create({
      data: {
        creatorProfileId: creatorProfile.id,
        platform,
        handle,
        socialUrl: input.url,
        followers: input.followerCount,
        engagementRate: input.engagementRate ?? null,
        isActive: true,
        verificationStatus: "UNVERIFIED",
        status: "APPROVED",
        rejectReason: null,
        reviewNote: null,
        reviewedAt: null,
        reviewedById: null
      }
    });
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && (error as { code?: string }).code === "P2002") {
      throw new AppError("Channel already exists", 409, "CHANNEL_EXISTS");
    }
    throw error;
  }

  await createNotification({
    accountId,
    event: "PROOF_SUBMITTED",
    title: "Đã thêm kênh mạng xã hội",
    content: "Kênh mạng xã hội mới đã được thêm và có thể sử dụng.",
    metadata: { platform: input.platform, url: input.url }
  });

  return getCreatorChannels(accountId);
}

export async function updateCreatorChannel(accountId: string, linkId: string, input: CreatorChannelsUpdateInput) {
  const link = await prisma.creatorSocialLink.findUnique({
    where: { id: linkId },
    include: { creatorProfile: { select: { accountId: true, id: true } } }
  });
  if (!link || link.creatorProfile.accountId !== accountId) {
    throw new AppError("Channel not found", 404, "CHANNEL_NOT_FOUND");
  }

  const platform = toSocialPlatform(input.platform);
  const handle = normalizeHandle(input.handle);
  validatePlatformUrl(platform, input.url);

  const duplicate = await prisma.creatorSocialLink.findFirst({
    where: {
      creatorProfileId: link.creatorProfileId,
      platform,
      handle,
      id: { not: link.id }
    },
    select: { id: true }
  });
  if (duplicate) {
    throw new AppError("Kênh trùng platform + handle", 409, "CHANNEL_DUPLICATE_HANDLE");
  }

  await prisma.creatorSocialLink.update({
    where: { id: link.id },
    data: {
      platform,
      handle,
      socialUrl: input.url,
      followers: input.followerCount,
      engagementRate: input.engagementRate ?? null,
      status: "APPROVED",
      verificationStatus: "UNVERIFIED",
      rejectReason: null,
      reviewNote: null,
      reviewedAt: null,
      reviewedById: null
    }
  });

  await createNotification({
    accountId,
    event: "PROOF_SUBMITTED",
    title: "Đã cập nhật kênh mạng xã hội",
    content: "Thông tin kênh đã được cập nhật và có thể sử dụng.",
    metadata: { linkId, platform: input.platform, url: input.url }
  });

  return getCreatorChannels(accountId);
}

export async function removeCreatorChannel(accountId: string, linkId: string) {
  const link = await prisma.creatorSocialLink.findUnique({
    where: { id: linkId },
    include: { creatorProfile: { select: { accountId: true } } }
  });
  if (!link || link.creatorProfile.accountId !== accountId) {
    throw new AppError("Channel not found", 404, "CHANNEL_NOT_FOUND");
  }
  await prisma.creatorSocialLink.delete({ where: { id: linkId } });
  return getCreatorChannels(accountId);
}

export async function setCreatorChannelActiveStatus(accountId: string, linkId: string, isActive: boolean) {
  const link = await prisma.creatorSocialLink.findUnique({
    where: { id: linkId },
    include: { creatorProfile: { select: { accountId: true } } }
  });
  if (!link || link.creatorProfile.accountId !== accountId) {
    throw new AppError("Channel not found", 404, "CHANNEL_NOT_FOUND");
  }
  await prisma.creatorSocialLink.update({ where: { id: link.id }, data: { isActive } });

  return getCreatorChannels(accountId);
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
