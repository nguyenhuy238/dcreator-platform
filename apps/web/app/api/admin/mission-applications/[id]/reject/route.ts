import { NextRequest } from "next/server";
import { ok } from "@/lib/api-response";
import { requireAdminOps } from "@/lib/auth/admin-guard";
import { toErrorResponse } from "@/lib/errors";
import { rejectMissionApplicationByAdmin } from "@/lib/services/creator-mission.service";
import { missionApplicationRejectSchema } from "@/lib/validators/mission-workflow";

type Props = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, { params }: Props) {
  try {
    const actor = await requireAdminOps(request);
    const body = missionApplicationRejectSchema.parse(await request.json());
    const { id } = await params;
    return ok(await rejectMissionApplicationByAdmin(actor.id, id, body.rejectReason));
  } catch (error) {
    return toErrorResponse(error);
  }
}
