import { NextRequest } from "next/server";
import { ok } from "@/lib/api-response";
import { requireAdminOps } from "@/lib/auth/admin-guard";
import { toErrorResponse } from "@/lib/errors";
import { missionTranscriptReviewRejectSchema } from "@/lib/validators/mission-workflow";
import { rejectMissionTranscriptReviewByAdmin } from "@/lib/services/creator-mission.service";

type Props = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, { params }: Props) {
  try {
    const actor = await requireAdminOps(request);
    const body = missionTranscriptReviewRejectSchema.parse(await request.json());
    const { id } = await params;
    return ok(await rejectMissionTranscriptReviewByAdmin(actor.id, id, body.feedback));
  } catch (error) {
    return toErrorResponse(error);
  }
}
