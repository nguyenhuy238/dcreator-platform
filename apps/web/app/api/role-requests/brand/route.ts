import { RoleRequestType } from "@prisma/client";
import { NextRequest } from "next/server";
import { ok } from "@/lib/api-response";
import { assertSameOrigin } from "@/lib/auth/csrf";
import { requireAuth } from "@/lib/auth/guard";
import { prisma } from "@/lib/db";
import { AppError, toErrorResponse } from "@/lib/errors";
import { brandRoleRequestSchema } from "@/lib/validators/auth";

export async function POST(request: NextRequest) {
  try {
    assertSameOrigin(request);
    const account = await requireAuth(request);
    const body = await request.json();
    const input = brandRoleRequestSchema.parse(body);

    const existing = await prisma.roleRequest.findFirst({
      where: {
        accountId: account.id,
        type: RoleRequestType.BRAND,
        status: "PENDING"
      },
      select: { id: true }
    });
    if (existing) {
      throw new AppError("Brand request is already pending", 409, "REQUEST_PENDING");
    }

    const roleRequest = await prisma.roleRequest.create({
      data: {
        accountId: account.id,
        type: RoleRequestType.BRAND,
        brandName: input.brandName,
        brandWebsite: input.brandWebsite,
        note: input.note
      }
    });

    return ok(roleRequest, 201);
  } catch (error) {
    return toErrorResponse(error);
  }
}
