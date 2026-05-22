import { ApplicationStatus } from "@prisma/client";
import { NextRequest } from "next/server";
import { ok } from "@/lib/api-response";
import { assertSameOrigin } from "@/lib/auth/csrf";
import { requireAdminOps } from "@/lib/auth/admin-guard";
import { toErrorResponse } from "@/lib/errors";
import { reviewCreatorApplication } from "@/lib/services/role-upgrade.service";
import { reviewApplicationSchema } from "@/lib/validators/role-upgrade";

type Props = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, { params }: Props) {
  try {
    assertSameOrigin(request);
    const actor = await requireAdminOps(request);
    const { id } = await params;
    const payload = reviewApplicationSchema.parse(await request.json());
    return ok(await reviewCreatorApplication(actor.id, id, payload.status as ApplicationStatus, payload.rejectReason, payload.reviewNote));
  } catch (error) {
    return toErrorResponse(error);
  }
}
