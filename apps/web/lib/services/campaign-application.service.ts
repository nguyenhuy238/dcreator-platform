import { ApplicationStatus, CampaignStatus, MissionLifecycleStatus, ProductReceiveOption, Role } from "@prisma/client";
import { appendCreatorCampaignApplicationTag } from "@/lib/constants/campaign-application";
import { prisma } from "@/lib/db";
import { AppError } from "@/lib/errors";
import { createNotification } from "@/lib/services/notification.service";

export type CreatorCampaignApplicationState =
  | "LOGIN_REQUIRED"
  | "NOT_CREATOR"
  | "PROFILE_REQUIRED"
  | "SOCIAL_CHANNEL_REQUIRED"
  | "CAMPAIGN_UNAVAILABLE"
  | "CAN_APPLY"
  | "PENDING_REVIEW"
  | "ASSIGNED"
  | "REJECTED";

export type CreatorCampaignApplicationSnapshot = {
  state: CreatorCampaignApplicationState;
  label: string;
  disabled: boolean;
  message: string;
  rejectReason: string | null;
  submissionId: string | null;
  missionId: string | null;
  lifecycleStatus: MissionLifecycleStatus | null;
};

type Viewer = {
  id: string;
  roles: Role[];
} | null;

function toSnapshot(
  state: CreatorCampaignApplicationState,
  partial?: Partial<Omit<CreatorCampaignApplicationSnapshot, "state">>
): CreatorCampaignApplicationSnapshot {
  const defaults: Record<CreatorCampaignApplicationState, Omit<CreatorCampaignApplicationSnapshot, "state">> = {
    LOGIN_REQUIRED: {
      label: "Đăng nhập để nộp đơn",
      disabled: false,
      message: "Bạn cần đăng nhập trước khi nộp đơn.",
      rejectReason: null,
      submissionId: null,
      missionId: null,
      lifecycleStatus: null
    },
    NOT_CREATOR: {
      label: "Chỉ dành cho Creator",
      disabled: true,
      message: "Bạn cần có quyền Creator để nộp đơn.",
      rejectReason: null,
      submissionId: null,
      missionId: null,
      lifecycleStatus: null
    },
    PROFILE_REQUIRED: {
      label: "Hoàn thiện thông tin mạng xã hội",
      disabled: true,
      message: "Bạn cần hoàn thiện hồ sơ Creator trước khi tham gia campaign.",
      rejectReason: null,
      submissionId: null,
      missionId: null,
      lifecycleStatus: null
    },
    SOCIAL_CHANNEL_REQUIRED: {
      label: "Bổ sung kênh mạng xã hội",
      disabled: true,
      message: "Bạn cần thêm ít nhất 1 kênh mạng xã hội đang sử dụng để tham gia campaign.",
      rejectReason: null,
      submissionId: null,
      missionId: null,
      lifecycleStatus: null
    },
    CAMPAIGN_UNAVAILABLE: {
      label: "Chiến dịch không khả dụng",
      disabled: true,
      message: "Chiến dịch không tồn tại hoặc chưa mở đăng ký.",
      rejectReason: null,
      submissionId: null,
      missionId: null,
      lifecycleStatus: null
    },
    CAN_APPLY: {
      label: "Nộp đơn đăng ký",
      disabled: false,
      message: "Nộp đơn để tham gia chiến dịch này.",
      rejectReason: null,
      submissionId: null,
      missionId: null,
      lifecycleStatus: null
    },
    PENDING_REVIEW: {
      label: "Đã nộp - Chờ duyệt",
      disabled: true,
      message: "Đơn của bạn đang chờ Brand/Admin duyệt.",
      rejectReason: null,
      submissionId: null,
      missionId: null,
      lifecycleStatus: "ACCEPTED"
    },
    ASSIGNED: {
      label: "Đã được duyệt",
      disabled: true,
      message: "Đơn đã được duyệt và bạn có thể bắt đầu quay video cho campaign.",
      rejectReason: null,
      submissionId: null,
      missionId: null,
      lifecycleStatus: "DOING"
    },
    REJECTED: {
      label: "Đăng ký lại",
      disabled: false,
      message: "Đơn trước đã bị từ chối, bạn có thể gửi lại.",
      rejectReason: null,
      submissionId: null,
      missionId: null,
      lifecycleStatus: "REJECTED"
    }
  };

  return { state, ...defaults[state], ...partial };
}

function toStateFromApplicationStatus(status: ApplicationStatus): CreatorCampaignApplicationState {
  if (status === "PENDING_REVIEW") return "PENDING_REVIEW";
  if (status === "APPROVED") return "ASSIGNED";
  if (status === "REJECTED") return "REJECTED";
  return "CAN_APPLY";
}

function toInitialMissionState(option: ProductReceiveOption) {
  if (option === "NO_PRODUCT_REQUIRED") {
    return {
      status: "IN_PROGRESS" as const,
      productStatus: "NOT_REQUIRED" as const,
      depositStatus: "NOT_REQUIRED" as const,
      reimbursementStatus: "NOT_REQUIRED" as const,
      startedAt: new Date()
    };
  }
  return {
    status: "PRODUCT_PENDING" as const,
    productStatus: "WAITING_PURCHASE" as const,
    depositStatus: "NOT_REQUIRED" as const,
    reimbursementStatus: "PENDING" as const,
    startedAt: null
  };
}

async function getCampaignForApplication(slug: string) {
  return prisma.campaign.findUnique({
    where: { slug },
    select: {
      id: true,
      status: true,
      isPublic: true,
      ugcVideoQuota: true,
      ugcVideoApprovedCount: true
    }
  });
}

export async function getCreatorCampaignApplicationStatus(
  slug: string,
  viewer: Viewer
): Promise<CreatorCampaignApplicationSnapshot> {
  const campaign = await getCampaignForApplication(slug);
  if (!campaign) return toSnapshot("CAMPAIGN_UNAVAILABLE");

  if (!campaign.isPublic || campaign.status !== CampaignStatus.ACTIVE) return toSnapshot("CAMPAIGN_UNAVAILABLE");
  const videoTarget = campaign.ugcVideoQuota ?? 0;
  const approvedVideos = campaign.ugcVideoApprovedCount ?? 0;
  if (videoTarget > 0 && approvedVideos >= videoTarget) {
    return toSnapshot("CAMPAIGN_UNAVAILABLE", {
      label: "Hết lượt video",
      message: `Campaign đã đủ ${videoTarget}/${videoTarget} video được duyệt.`
    });
  }

  if (!viewer) return toSnapshot("LOGIN_REQUIRED");
  if (!viewer.roles.includes(Role.CREATOR)) return toSnapshot("NOT_CREATOR");

  const creatorProfile = await prisma.creatorProfile.findUnique({ where: { accountId: viewer.id }, select: { id: true } });
  if (!creatorProfile) return toSnapshot("PROFILE_REQUIRED");
  const activeChannelCount = await prisma.creatorSocialLink.count({
    where: { creatorProfileId: creatorProfile.id, isActive: true }
  });
  if (activeChannelCount < 1) return toSnapshot("SOCIAL_CHANNEL_REQUIRED");

  const existing = await prisma.creatorMission.findFirst({
    where: { accountId: viewer.id, campaignId: campaign.id },
    orderBy: { appliedAt: "desc" },
    select: { id: true, applicationStatus: true, applicationRejectReason: true }
  });

  if (existing) {
    const state = toStateFromApplicationStatus(existing.applicationStatus);
    return toSnapshot(state, {
      submissionId: existing.id,
      missionId: null,
      lifecycleStatus: state === "ASSIGNED" ? "DOING" : state === "REJECTED" ? "REJECTED" : "ACCEPTED",
      rejectReason: existing.applicationRejectReason
    });
  }

  return toSnapshot("CAN_APPLY", { missionId: null });
}

export async function submitCreatorCampaignApplication(slug: string, accountId: string) {
  const CREATOR_CAMPAIGN_REAPPLY_LIMIT = 2;
  const campaign = await getCampaignForApplication(slug);
  if (!campaign) {
    throw new AppError("Campaign not found", 404, "CAMPAIGN_NOT_FOUND");
  }

  if (!campaign.isPublic || campaign.status !== CampaignStatus.ACTIVE) {
    throw new AppError("Campaign is not open for creator application", 409, "CAMPAIGN_NOT_OPEN");
  }
  const videoTarget = campaign.ugcVideoQuota ?? 0;
  const approvedVideos = campaign.ugcVideoApprovedCount ?? 0;
  if (videoTarget > 0 && approvedVideos >= videoTarget) {
    throw new AppError("Campaign đã hết lượt video được phê duyệt", 409, "CAMPAIGN_UGC_VIDEO_QUOTA_REACHED");
  }

  const creatorProfile = await prisma.creatorProfile.findUnique({ where: { accountId }, select: { id: true } });
  if (!creatorProfile) throw new AppError("Creator profile is required", 422, "CREATOR_PROFILE_REQUIRED");
  const activeChannels = await prisma.creatorSocialLink.findMany({
    where: { creatorProfileId: creatorProfile.id, isActive: true },
    select: { platform: true, socialUrl: true, followers: true, handle: true }
  });
  if (activeChannels.length < 1) {
    throw new AppError(
      "Bạn cần thêm ít nhất 1 kênh mạng xã hội đang sử dụng trước khi tham gia campaign.",
      422,
      "CREATOR_SOCIAL_CHANNEL_REQUIRED"
    );
  }

  const existing = await prisma.creatorMission.findFirst({
    where: { campaignId: campaign.id, accountId },
    select: { id: true, applicationStatus: true }
  });
  if (existing) {
    if (existing.applicationStatus !== "REJECTED") {
      throw new AppError("Creator has already applied to this campaign", 409, "CREATOR_CAMPAIGN_ALREADY_APPLIED");
    }

    const reapplyCount = await prisma.auditLog.count({
      where: {
        targetType: "CreatorMission",
        targetId: existing.id,
        action: "CREATOR_CAMPAIGN_APPLICATION_RESUBMITTED"
      }
    });

    if (reapplyCount >= CREATOR_CAMPAIGN_REAPPLY_LIMIT) {
      throw new AppError(
        "Bạn chỉ có thể đăng ký lại campaign này tối đa 2 lần.",
        409,
        "CREATOR_CAMPAIGN_REAPPLY_LIMIT_REACHED"
      );
    }

    const reapplied = await prisma.creatorMission.update({
      where: { id: existing.id },
      data: {
        applicationStatus: "PENDING_REVIEW",
        applicationRejectReason: null,
        applicationReviewedById: null,
        applicationReviewedAt: null,
        applicationNote: appendCreatorCampaignApplicationTag(null, slug),
        appliedAt: new Date()
      }
    });

    await prisma.auditLog.create({
      data: {
        actorId: accountId,
        action: "CREATOR_CAMPAIGN_APPLICATION_RESUBMITTED",
        targetType: "CreatorMission",
        targetId: reapplied.id,
        metadata: {
          campaignId: campaign.id,
          missionId: null,
          reapplyCount: reapplyCount + 1,
          reapplyLimit: CREATOR_CAMPAIGN_REAPPLY_LIMIT
        }
      }
    });

    await createNotification({
      accountId,
      event: "MISSION_ACCEPTED",
      title: "Đã gửi đăng ký campaign",
      content: "Bạn đã đăng ký lại campaign này và đang chờ Brand/Admin duyệt.",
      metadata: { campaignId: campaign.id, creatorMissionId: reapplied.id }
    });

    return {
      submissionId: reapplied.id,
      missionId: null,
      lifecycleStatus: "ACCEPTED" as const,
      status: toSnapshot("PENDING_REVIEW", {
        submissionId: reapplied.id,
        missionId: null,
        lifecycleStatus: "ACCEPTED"
      })
    };
  }

  const initial = toInitialMissionState(ProductReceiveOption.PRODUCT_REQUIRED);
  const application = await prisma.creatorMission.create({
    data: {
      missionId: null,
      campaignId: campaign.id,
      accountId,
      status: initial.status,
      productReceiveOption: ProductReceiveOption.PRODUCT_REQUIRED,
      productStatus: initial.productStatus,
      depositStatus: initial.depositStatus,
      reimbursementStatus: initial.reimbursementStatus,
      startedAt: initial.startedAt,
      applicationStatus: "PENDING_REVIEW",
      applicationNote: appendCreatorCampaignApplicationTag(null, slug),
      appliedAt: new Date(),
      submissionStatus: "OPEN",
      submissionLifecycleStatus: "ACCEPTED"
    }
  });

  await prisma.auditLog.create({
    data: {
      actorId: accountId,
      action: "CREATOR_CAMPAIGN_APPLICATION_SUBMITTED",
      targetType: "CreatorMission",
      targetId: application.id,
      metadata: {
        campaignId: campaign.id,
        missionId: null,
        creatorSocialChannels: activeChannels
      }
    }
  });

  await createNotification({
    accountId,
    event: "MISSION_ACCEPTED",
    title: "Đăng ký campaign thành công",
    content: "Đơn đăng ký của bạn đã được ghi nhận. Hệ thống sẽ thông báo khi Brand/Admin duyệt.",
    metadata: { campaignId: campaign.id, creatorMissionId: application.id }
  });

  return {
    submissionId: application.id,
    missionId: null,
    lifecycleStatus: "ACCEPTED" as const,
    status: toSnapshot("PENDING_REVIEW", {
      submissionId: application.id,
      missionId: null,
      lifecycleStatus: "ACCEPTED"
    })
  };
}
