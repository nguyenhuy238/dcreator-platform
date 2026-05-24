import { NextRequest } from "next/server";
import { ok } from "@/lib/api-response";
import { requireAdminOps } from "@/lib/auth/admin-guard";
import { toErrorResponse } from "@/lib/errors";
import { rejectMissionFinalReviewByAdmin } from "@/lib/services/creator-mission.service";
import { missionFinalReviewRejectSchema } from "@/lib/validators/mission-workflow";

type Props = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, { params }: Props) {
  try {
    const actor = await requireAdminOps(request);
    const body = missionFinalReviewRejectSchema.parse(await request.json());
    const { id } = await params;
    return ok(await rejectMissionFinalReviewByAdmin(actor.id, id, body.feedback));
  } catch (error) {
    return toErrorResponse(error);
  }
}
