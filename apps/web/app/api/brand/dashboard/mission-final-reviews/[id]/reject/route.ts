import { NextRequest } from "next/server";
import { ok } from "@/lib/api-response";
import { requireBrandActor } from "@/lib/auth/brand-guard";
import { toErrorResponse } from "@/lib/errors";
import { rejectMissionFinalReviewByBrand } from "@/lib/services/creator-mission.service";
import { missionFinalReviewRejectSchema } from "@/lib/validators/mission-workflow";

type Props = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, { params }: Props) {
  try {
    const actor = await requireBrandActor(request);
    const body = missionFinalReviewRejectSchema.parse(await request.json());
    const { id } = await params;
    return ok(await rejectMissionFinalReviewByBrand(actor.id, id, body));
  } catch (error) {
    return toErrorResponse(error);
  }
}
