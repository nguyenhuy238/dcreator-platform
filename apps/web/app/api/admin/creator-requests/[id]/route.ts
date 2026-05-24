import { NextRequest } from "next/server";
import { ok } from "@/lib/api-response";
import { requireAdminOps } from "@/lib/auth/admin-guard";
import { toErrorResponse } from "@/lib/errors";
import { getCreatorSocialLinkRequestDetail } from "@/lib/services/creator-social-link-review.service";

type Props = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, { params }: Props) {
  try {
    await requireAdminOps(request);
    const { id } = await params;
    const detail = await getCreatorSocialLinkRequestDetail(id);
    return ok({
      id: detail.id,
      status: detail.status,
      displayName: detail.creatorProfile.displayName,
      mainPlatform: detail.platform,
      socialUrl: detail.socialUrl,
      contentCategory: detail.creatorProfile.contentCategory,
      followerCount: detail.followers,
      bio: detail.creatorProfile.bio,
      phone: detail.creatorProfile.phone,
      reviewNote: detail.reviewNote,
      rejectReason: detail.rejectReason,
      createdAt: detail.createdAt,
      reviewedAt: detail.reviewedAt,
      account: {
        ...detail.creatorProfile.account,
        creatorProfile: {
          id: detail.creatorProfile.id,
          mainPlatform: detail.creatorProfile.mainPlatform,
          socialUrl: detail.creatorProfile.socialUrl,
          handle: detail.creatorProfile.handle,
          followerCount: detail.creatorProfile.followerCount,
          contentCategory: detail.creatorProfile.contentCategory
        }
      },
      reviewedBy: detail.reviewedBy,
      statusHistory: detail.statusHistory
    });
  } catch (error) {
    return toErrorResponse(error);
  }
}
