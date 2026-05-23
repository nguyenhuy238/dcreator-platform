import { NextRequest } from "next/server";
import { ok } from "@/lib/api-response";
import { requireAuth } from "@/lib/auth/guard";
import { toErrorResponse } from "@/lib/errors";

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth(request);
    const response = ok({
      user: {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
        avatarUrl: user.avatarUrl,
        primaryRole: user.primaryRole,
        roles: user.roles,
        isActive: user.isActive,
        creatorProfile: user.creatorProfile,
        brandMemberships: user.brandMemberships,
        activeBrandId: user.activeBrandId,
        permissions: user.permissions,
        creatorRequestStatus: user.creatorRequestStatus,
        brandRequestStatus: user.brandRequestStatus
      }
    });
    response.headers.set("Cache-Control", "private, max-age=15, stale-while-revalidate=30");
    return response;
  } catch (error) {
    return toErrorResponse(error);
  }
}
