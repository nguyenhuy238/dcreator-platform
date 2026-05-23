import { ApplicationStatus } from "@prisma/client";
import { NextRequest } from "next/server";
import { ok } from "@/lib/api-response";
import { requireAdminOps } from "@/lib/auth/admin-guard";
import { assertSameOrigin } from "@/lib/auth/csrf";
import { toErrorResponse } from "@/lib/errors";
import { reviewCreatorApplication } from "@/lib/services/role-upgrade.service";

type Props = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, { params }: Props) {
  try {
    assertSameOrigin(request);
    const actor = await requireAdminOps(request);
    const { id } = await params;
    return ok(await reviewCreatorApplication(actor.id, id, ApplicationStatus.APPROVED));
  } catch (error) {
    return toErrorResponse(error);
  }
}
