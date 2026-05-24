import { NextRequest } from "next/server";
import { ok } from "@/lib/api-response";
import { requireBrandActor } from "@/lib/auth/brand-guard";
import { toErrorResponse } from "@/lib/errors";
import { rejectMissionApplicationByBrand } from "@/lib/services/creator-mission.service";
import { missionApplicationRejectSchema } from "@/lib/validators/mission-workflow";

type Props = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, { params }: Props) {
  try {
    const actor = await requireBrandActor(request);
    const body = missionApplicationRejectSchema.parse(await request.json());
    const { id } = await params;
    return ok(await rejectMissionApplicationByBrand(actor.id, id, body.rejectReason));
  } catch (error) {
    return toErrorResponse(error);
  }
}
