import { NextRequest } from "next/server";
import { ok } from "@/lib/api-response";
import { requireAdminOps } from "@/lib/auth/admin-guard";
import { toErrorResponse } from "@/lib/errors";
import { rejectMissionVideoReviewByAdmin } from "@/lib/services/creator-mission.service";
import { missionVideoReviewRejectSchema } from "@/lib/validators/mission-workflow";

type Props = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, { params }: Props) {
  try {
    const actor = await requireAdminOps(request);
    const body = missionVideoReviewRejectSchema.parse(await request.json());
    const { id } = await params;
    return ok(await rejectMissionVideoReviewByAdmin(actor.id, id, body.feedback));
  } catch (error) {
    return toErrorResponse(error);
  }
}
