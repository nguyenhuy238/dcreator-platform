import { CampaignStatus, MissionAudience, MissionLifecycleStatus, Role } from "@prisma/client";
import { appendCreatorCampaignApplicationTag } from "@/lib/constants/campaign-application";
import { prisma } from "@/lib/db";
import { AppError } from "@/lib/errors";
import { acceptMission } from "@/lib/services/mission.service";

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
      submissionId: null,
      missionId: null,
      lifecycleStatus: null
    },
    NOT_CREATOR: {
      label: "Chỉ dành cho Creator",
      disabled: true,
      message: "Bạn cần có quyền Creator để nộp đơn.",
      submissionId: null,
      missionId: null,
      lifecycleStatus: null
    },
    PROFILE_REQUIRED: {
      label: "Hoàn thiện hồ sơ Creator",
      disabled: true,
      message: "Vui lòng hoàn thiện hồ sơ Creator trước khi nộp đơn.",
      submissionId: null,
      missionId: null,
      lifecycleStatus: null
    },
    CAMPAIGN_UNAVAILABLE: {
      label: "Chiến dịch không khả dụng",
      disabled: true,
      message: "Chiến dịch không tồn tại hoặc chưa mở đăng ký.",
      submissionId: null,
      missionId: null,
      lifecycleStatus: null
    },
    MISSION_UNAVAILABLE: {
      label: "Chưa có nhiệm vụ mở",
      disabled: true,
      message: "Chiến dịch chưa có nhiệm vụ đang mở.",
      submissionId: null,
      missionId: null,
      lifecycleStatus: null
    },
    CAN_APPLY: {
      label: "Nộp đơn đăng ký",
      disabled: false,
      message: "Nộp đơn để tham gia chiến dịch này.",
      submissionId: null,
      missionId: null,
      lifecycleStatus: null
    },
    PENDING_REVIEW: {
      label: "Đã nộp - Chờ duyệt",
      disabled: true,
      message: "Đơn của bạn đang chờ Brand/Admin duyệt.",
      submissionId: null,
      missionId: null,
      lifecycleStatus: "ACCEPTED"
    },
    ASSIGNED: {
      label: "Đã nhận nhiệm vụ",
      disabled: true,
      message: "Đơn đã được duyệt và bạn đã được nhận nhiệm vụ.",
      submissionId: null,
      missionId: null,
      lifecycleStatus: "DOING"
    },
    REJECTED: {
      label: "Đơn đã bị từ chối",
      disabled: true,
      message: "Đơn đăng ký đã bị từ chối.",
      submissionId: null,
      missionId: null,
      lifecycleStatus: "REJECTED"
    }
  };

  return { state, ...defaults[state], ...partial };
}

function toStateFromLifecycle(status: MissionLifecycleStatus): CreatorCampaignApplicationState {
  if (status === "ACCEPTED") return "PENDING_REVIEW";
  if (status === "DOING") return "ASSIGNED";
  if (status === "REJECTED") return "REJECTED";
  return "ASSIGNED";
}

async function getCampaignAndCreatorMission(slug: string) {
  const campaign = await prisma.campaign.findUnique({
    where: { slug },
    select: {
      id: true,
      status: true,
      isPublic: true,
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
  if (!campaignData) {
    return toSnapshot("CAMPAIGN_UNAVAILABLE");
  }

  const { campaign, firstMission } = campaignData;
  if (!campaign.isPublic || campaign.status !== CampaignStatus.ACTIVE) {
    return toSnapshot("CAMPAIGN_UNAVAILABLE");
  }

  if (!viewer) return toSnapshot("LOGIN_REQUIRED");
  if (!viewer.roles.includes(Role.CREATOR)) return toSnapshot("NOT_CREATOR");

  const creatorProfile = await prisma.creatorProfile.findUnique({
    where: { accountId: viewer.id },
    select: { id: true }
  });
  if (!creatorProfile) return toSnapshot("PROFILE_REQUIRED");

  const existing = await prisma.missionSubmission.findFirst({
    where: {
      accountId: viewer.id,
      mission: {
        campaignId: campaign.id,
        audience: { in: [MissionAudience.CREATOR, MissionAudience.USER] }
      }
    },
    orderBy: { createdAt: "desc" },
    select: { id: true, missionId: true, lifecycleStatus: true }
  });

  if (existing) {
    const state = toStateFromLifecycle(existing.lifecycleStatus);
    return toSnapshot(state, {
      submissionId: existing.id,
      missionId: existing.missionId,
      lifecycleStatus: existing.lifecycleStatus
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

  const creatorProfile = await prisma.creatorProfile.findUnique({
    where: { accountId },
    select: { id: true, mainPlatform: true, socialUrl: true, followerCount: true }
  });
  if (!creatorProfile) {
    throw new AppError("Creator profile is required", 422, "CREATOR_PROFILE_REQUIRED");
  }

  const existing = await prisma.missionSubmission.findFirst({
    where: {
      accountId,
      mission: {
        campaignId: campaign.id,
        audience: { in: [MissionAudience.CREATOR, MissionAudience.USER] }
      }
    },
    select: { id: true, lifecycleStatus: true }
  });
  if (existing) {
    throw new AppError("Creator has already applied to this campaign", 409, "CREATOR_CAMPAIGN_ALREADY_APPLIED");
  }

  if (!firstMission) {
    throw new AppError("Campaign has no creator mission", 409, "CREATOR_MISSION_NOT_AVAILABLE");
  }

  const missionRole = firstMission.audience === MissionAudience.USER ? Role.USER : Role.CREATOR;
  const submission = await acceptMission(firstMission.id, accountId, missionRole);

  await prisma.missionSubmission.update({
    where: { id: submission.id },
    data: { note: appendCreatorCampaignApplicationTag(submission.note, slug) }
  });

  await prisma.auditLog.create({
    data: {
      actorId: accountId,
      action: "CREATOR_CAMPAIGN_APPLICATION_SUBMITTED",
      targetType: "MissionSubmission",
      targetId: submission.id,
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
    submissionId: submission.id,
    missionId: submission.missionId,
    lifecycleStatus: submission.lifecycleStatus,
    status: toSnapshot("PENDING_REVIEW", {
      submissionId: submission.id,
      missionId: submission.missionId,
      lifecycleStatus: submission.lifecycleStatus
    })
  };
}
