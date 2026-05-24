import { NextRequest } from "next/server";
import { ok } from "@/lib/api-response";
import { requireAdminOps } from "@/lib/auth/admin-guard";
import { toErrorResponse } from "@/lib/errors";
import { approveMissionFinalReviewByAdmin } from "@/lib/services/creator-mission.service";
import { missionFinalReviewApproveSchema } from "@/lib/validators/mission-workflow";

type Props = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, { params }: Props) {
  try {
    const actor = await requireAdminOps(request);
    const body = missionFinalReviewApproveSchema.parse(await request.json());
    const { id } = await params;
    return ok(await approveMissionFinalReviewByAdmin(actor.id, id, body));
  } catch (error) {
    return toErrorResponse(error);
  }
}
