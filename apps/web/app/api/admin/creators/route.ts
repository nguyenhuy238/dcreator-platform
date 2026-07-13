import { NextRequest } from "next/server";
import { ok } from "@/lib/api-response";
import { requireAdminOps } from "@/lib/auth/admin-guard";
import { prisma } from "@/lib/db";
import { toErrorResponse } from "@/lib/errors";

export async function GET(request: NextRequest) {
  try {
    await requireAdminOps(request);
    const query = request.nextUrl.searchParams.get("query")?.trim() ?? "";
    const status = request.nextUrl.searchParams.get("status")?.trim() ?? "";

    const profiles = await prisma.creatorProfile.findMany({
      where: {
        ...(status === "SUSPENDED" ? { isSuspended: true } : status === "ACTIVE" ? { isSuspended: false } : {}),
        ...(query
          ? {
              OR: [
                { displayName: { contains: query, mode: "insensitive" } },
                { handle: { contains: query, mode: "insensitive" } },
                { socialUrl: { contains: query, mode: "insensitive" } },
                { account: { email: { contains: query, mode: "insensitive" } } },
                { account: { displayName: { contains: query, mode: "insensitive" } } }
              ]
            }
          : {})
      },
      include: {
        account: {
          select: {
            id: true,
            email: true,
            displayName: true,
            isActive: true,
            profile: { select: { socialLinks: true } },
            _count: { select: { campaignsAsCreator: true, submissions: true, payoutRequests: true } }
          }
        },
        socialLinks: { select: { verificationStatus: true, status: true, isActive: true } },
        _count: { select: { socialLinks: true } }
      },
      orderBy: { createdAt: "desc" },
    });

    return ok(
      profiles.map((profile) => {
        const socialMeta = profile.account.profile?.socialLinks;
        const kycVerified = typeof socialMeta === "object" && socialMeta !== null && !Array.isArray(socialMeta) && "kycVerified" in socialMeta && socialMeta.kycVerified === true;
        const verificationStatus = kycVerified
          ? "verified"
          : profile.socialLinks.some((item) => item.verificationStatus === "PENDING")
            ? "pending"
            : profile.socialLinks.some((item) => item.verificationStatus === "REJECTED")
              ? "rejected"
              : "unverified";
        const riskFlag = profile.isSuspended || profile.socialLinks.some((item) => item.status === "REJECTED");
        return {
          id: profile.id,
          accountId: profile.accountId,
          displayName: profile.displayName,
          mainPlatform: profile.mainPlatform ?? "OTHER",
          socialUrl: profile.socialUrl ?? "",
          contentCategory: profile.contentCategory,
          status: profile.isSuspended ? "suspended" : profile.account.isActive ? "active" : "restricted",
          verificationStatus,
          riskFlag,
          campaignCount: profile.account._count.campaignsAsCreator + profile.account._count.submissions,
          payoutCount: profile.account._count.payoutRequests,
          transactionTotal: 0,
          channelCount: profile._count.socialLinks,
          account: { email: profile.account.email, displayName: profile.account.displayName },
          createdAt: profile.createdAt.toISOString()
        };
      })
    );
  } catch (error) {
    return toErrorResponse(error);
  }
}
