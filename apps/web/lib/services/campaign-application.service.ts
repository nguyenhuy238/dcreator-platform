import { ApplicationStatus, CampaignStatus, MissionAudience, MissionLifecycleStatus, Role } from "@prisma/client";
import { appendCreatorCampaignApplicationTag } from "@/lib/constants/campaign-application";
import { prisma } from "@/lib/db";
import { AppError } from "@/lib/errors";

export type CreatorCampaignApplicationState =
  | "LOGIN_REQUIRED"
  | "NOT_CREATOR"
  | "PROFILE_REQUIRED"
  | "CAMPAIGN_UNAVAILABLE"
  | "MISSION_UNAVAILABLE"
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
      message: "Bạn cần hoàn thiện hồ sơ Creator và chọn nền tảng chính trước khi xin làm nhiệm vụ.",
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
    MISSION_UNAVAILABLE: {
      label: "Chưa có nhiệm vụ mở",
      disabled: true,
      message: "Chiến dịch chưa có nhiệm vụ đang mở.",
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
      label: "Đã nhận nhiệm vụ",
      disabled: true,
      message: "Đơn đã được duyệt và bạn đã được nhận nhiệm vụ.",
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

async function getCampaignAndCreatorMission(slug: string) {
  const campaign = await prisma.campaign.findUnique({
    where: { slug },
    select: {
      id: true,
      status: true,
      isPublic: true,
      ugcVideoQuota: true,
      ugcVideoApprovedCount: true,
      missions: {
        where: {
          status: "OPEN",
          audience: { in: [MissionAudience.CREATOR, MissionAudience.USER] }
        },
        orderBy: { createdAt: "asc" },
        select: { id: true, audience: true }
      }
    }
  });

  if (!campaign) return null;
  const firstCreatorMission = campaign.missions.find((mission) => mission.audience === MissionAudience.CREATOR);
  const firstMission = firstCreatorMission ?? campaign.missions[0] ?? null;
  return { campaign, firstMission };
}

export async function getCreatorCampaignApplicationStatus(
  slug: string,
  viewer: Viewer
): Promise<CreatorCampaignApplicationSnapshot> {
  const campaignData = await getCampaignAndCreatorMission(slug);
  if (!campaignData) return toSnapshot("CAMPAIGN_UNAVAILABLE");

  const { campaign, firstMission } = campaignData;
  if (!campaign.isPublic || campaign.status !== CampaignStatus.ACTIVE) return toSnapshot("CAMPAIGN_UNAVAILABLE");
  const videoTarget = campaign.ugcVideoQuota ?? 0;
  const approvedVideos = campaign.ugcVideoApprovedCount ?? 0;
  if (videoTarget > 0 && approvedVideos >= videoTarget) {
    return toSnapshot("MISSION_UNAVAILABLE", {
      label: "Hết lượt video",
      message: `Campaign đã đủ ${videoTarget}/${videoTarget} video được duyệt.`
    });
  }

  if (!viewer) return toSnapshot("LOGIN_REQUIRED");
  if (!viewer.roles.includes(Role.CREATOR)) return toSnapshot("NOT_CREATOR");

  const creatorProfile = await prisma.creatorProfile.findUnique({
    where: { accountId: viewer.id },
    select: { id: true, mainPlatform: true }
  });
  if (!creatorProfile || !creatorProfile.mainPlatform) return toSnapshot("PROFILE_REQUIRED");

  const existing = await prisma.missionApplication.findFirst({
    where: { accountId: viewer.id, campaignId: campaign.id },
    orderBy: { createdAt: "desc" },
    select: { id: true, missionId: true, status: true, rejectReason: true }
  });

  if (existing) {
    const state = toStateFromApplicationStatus(existing.status);
    return toSnapshot(state, {
      submissionId: existing.id,
      missionId: existing.missionId,
      lifecycleStatus: state === "ASSIGNED" ? "DOING" : state === "REJECTED" ? "REJECTED" : "ACCEPTED",
      rejectReason: existing.rejectReason
    });
  }

  if (!firstMission) return toSnapshot("MISSION_UNAVAILABLE");
  return toSnapshot("CAN_APPLY", { missionId: firstMission.id });
}

export async function submitCreatorCampaignApplication(slug: string, accountId: string) {
  const campaignData = await getCampaignAndCreatorMission(slug);
  if (!campaignData) {
    throw new AppError("Campaign not found", 404, "CAMPAIGN_NOT_FOUND");
  }

  const { campaign, firstMission } = campaignData;
  if (!campaign.isPublic || campaign.status !== CampaignStatus.ACTIVE) {
    throw new AppError("Campaign is not open for creator application", 409, "CAMPAIGN_NOT_OPEN");
  }
  const videoTarget = campaign.ugcVideoQuota ?? 0;
  const approvedVideos = campaign.ugcVideoApprovedCount ?? 0;
  if (videoTarget > 0 && approvedVideos >= videoTarget) {
    throw new AppError("Campaign đã hết lượt video được phê duyệt", 409, "CAMPAIGN_UGC_VIDEO_QUOTA_REACHED");
  }

  if (!firstMission) {
    throw new AppError("Campaign has no creator mission", 409, "CREATOR_MISSION_NOT_AVAILABLE");
  }

  const creatorProfile = await prisma.creatorProfile.findUnique({
    where: { accountId },
    select: { id: true, mainPlatform: true, socialUrl: true, followerCount: true }
  });
  if (!creatorProfile || !creatorProfile.mainPlatform) {
    throw new AppError(
      "Bạn cần hoàn thiện hồ sơ Creator và chọn nền tảng chính trước khi xin làm nhiệm vụ.",
      422,
      "CREATOR_PROFILE_MAIN_PLATFORM_REQUIRED"
    );
  }

  const existing = await prisma.missionApplication.findUnique({
    where: {
      missionId_accountId: {
        missionId: firstMission.id,
        accountId
      }
    },
    select: { id: true, status: true }
  });
  if (existing) {
    if (existing.status !== "REJECTED") {
      throw new AppError("Creator has already applied to this campaign", 409, "CREATOR_CAMPAIGN_ALREADY_APPLIED");
    }

    const reapplied = await prisma.missionApplication.update({
      where: { id: existing.id },
      data: {
        status: "PENDING_REVIEW",
        rejectReason: null,
        reviewedById: null,
        reviewedAt: null,
        note: appendCreatorCampaignApplicationTag(null, slug)
      }
    });

    await prisma.auditLog.create({
      data: {
        actorId: accountId,
        action: "CREATOR_CAMPAIGN_APPLICATION_RESUBMITTED",
        targetType: "MissionApplication",
        targetId: reapplied.id,
        metadata: {
          campaignId: campaign.id,
          missionId: firstMission.id
        }
      }
    });

    return {
      submissionId: reapplied.id,
      missionId: reapplied.missionId,
      lifecycleStatus: "ACCEPTED" as const,
      status: toSnapshot("PENDING_REVIEW", {
        submissionId: reapplied.id,
        missionId: reapplied.missionId,
        lifecycleStatus: "ACCEPTED"
      })
    };
  }

  const application = await prisma.missionApplication.create({
    data: {
      missionId: firstMission.id,
      campaignId: campaign.id,
      accountId,
      status: "PENDING_REVIEW",
      note: appendCreatorCampaignApplicationTag(null, slug)
    }
  });

  await prisma.auditLog.create({
    data: {
      actorId: accountId,
      action: "CREATOR_CAMPAIGN_APPLICATION_SUBMITTED",
      targetType: "MissionApplication",
      targetId: application.id,
      metadata: {
        campaignId: campaign.id,
        missionId: firstMission.id,
        creatorProfile: {
          mainPlatform: creatorProfile.mainPlatform,
          socialUrl: creatorProfile.socialUrl,
          followerCount: creatorProfile.followerCount
        }
      }
    }
  });

  return {
    submissionId: application.id,
    missionId: application.missionId,
    lifecycleStatus: "ACCEPTED" as const,
    status: toSnapshot("PENDING_REVIEW", {
      submissionId: application.id,
      missionId: application.missionId,
      lifecycleStatus: "ACCEPTED"
    })
  };
}
