import { NextRequest } from "next/server";
import { ok } from "@/lib/api-response";
import { requireAdminOps } from "@/lib/auth/admin-guard";
import { toErrorResponse } from "@/lib/errors";
import { listCreatorSocialLinkRequests } from "@/lib/services/creator-social-link-review.service";
import { adminCreatorSocialLinkListQuerySchema } from "@/lib/validators/admin-creator";

const SOCIAL_PLATFORMS = ["TIKTOK", "INSTAGRAM", "YOUTUBE", "FACEBOOK", "OTHER"] as const;

export async function GET(request: NextRequest) {
  try {
    await requireAdminOps(request);
    const statusRaw = request.nextUrl.searchParams.get("status") ?? undefined;
    const query = request.nextUrl.searchParams.get("query") ?? undefined;
    const platformRaw = request.nextUrl.searchParams.get("platform") ?? undefined;
    const sort = request.nextUrl.searchParams.get("sort") ?? undefined;

    const parsed = adminCreatorSocialLinkListQuerySchema.parse({
      status: statusRaw === "PENDING" || statusRaw === "APPROVED" || statusRaw === "REJECTED" ? statusRaw : undefined,
      query,
      platform: platformRaw && SOCIAL_PLATFORMS.includes(platformRaw as (typeof SOCIAL_PLATFORMS)[number]) ? platformRaw : undefined,
      sort
    });
    const rows = await listCreatorSocialLinkRequests({
      status: parsed.status,
      query: parsed.query,
      platform: parsed.platform,
      sort: parsed.sort
    });

    return ok(
      rows.map((row: Awaited<typeof rows>[number]) => ({
        id: row.id,
        status: row.status,
        displayName: row.creatorProfile.displayName,
        mainPlatform: row.platform,
        socialUrl: row.socialUrl,
        contentCategory: row.creatorProfile.contentCategory,
        followerCount: row.followers,
        bio: row.creatorProfile.bio,
        phone: row.creatorProfile.phone,
        reviewNote: row.reviewNote,
        rejectReason: row.rejectReason,
        createdAt: row.createdAt,
        reviewedAt: row.reviewedAt,
        account: row.creatorProfile.account,
        reviewedBy: row.reviewedBy
      }))
    );
  } catch (error) {
    return toErrorResponse(error);
  }
}
