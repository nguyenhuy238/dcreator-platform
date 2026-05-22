import { Role, RoleRequestStatus, RoleRequestType } from "@prisma/client";
import { NextRequest } from "next/server";
import { ok } from "@/lib/api-response";
import { assertSameOrigin } from "@/lib/auth/csrf";
import { requireRole } from "@/lib/auth/guards";
import { DASHBOARD_ACCESS } from "@/lib/auth/role-constants";
import { prisma } from "@/lib/db";
import { AppError, toErrorResponse } from "@/lib/errors";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ requestId: string }> }
) {
  try {
    assertSameOrigin(request);
    const reviewer = await requireRole(request, DASHBOARD_ACCESS.admin);
    const { requestId } = await context.params;
    if (!requestId) {
      throw new AppError("requestId is required", 422, "VALIDATION_ERROR");
    }

    const roleRequest = await prisma.roleRequest.findUnique({ where: { id: requestId } });
    if (!roleRequest) {
      throw new AppError("Role request not found", 404, "REQUEST_NOT_FOUND");
    }

    if (roleRequest.status !== RoleRequestStatus.PENDING) {
      throw new AppError("Role request already processed", 409, "REQUEST_ALREADY_PROCESSED");
    }

    const targetRole = roleRequest.type === RoleRequestType.CREATOR ? Role.CREATOR : Role.BRAND_OWNER;
    const updated = await prisma.$transaction(async (tx) => {
      const req = await tx.roleRequest.update({
        where: { id: roleRequest.id },
        data: {
          status: RoleRequestStatus.APPROVED,
          reviewedAt: new Date(),
          reviewedById: reviewer.id
        }
      });

      const account = await tx.account.update({
        where: { id: req.accountId },
        data: { role: targetRole },
        select: { id: true, email: true, role: true }
      });

      return { req, account };
    });

    return ok(updated);
  } catch (error) {
    return toErrorResponse(error);
  }
}
