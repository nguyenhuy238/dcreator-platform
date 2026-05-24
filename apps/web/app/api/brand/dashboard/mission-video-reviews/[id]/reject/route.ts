import { NextRequest } from "next/server";
import { ok } from "@/lib/api-response";
import { requireBrandActor } from "@/lib/auth/brand-guard";
import { toErrorResponse } from "@/lib/errors";
import { rejectMissionVideoReviewByBrand } from "@/lib/services/creator-mission.service";
import { missionVideoReviewRejectSchema } from "@/lib/validators/mission-workflow";

type Props = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, { params }: Props) {
  try {
    const actor = await requireBrandActor(request);
    const body = missionVideoReviewRejectSchema.parse(await request.json());
    const { id } = await params;
    return ok(await rejectMissionVideoReviewByBrand(actor.id, id, body.feedback));
  } catch (error) {
    return toErrorResponse(error);
  }
}
