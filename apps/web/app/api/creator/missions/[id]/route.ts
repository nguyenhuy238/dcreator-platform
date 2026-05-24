import { NextRequest } from "next/server";
import { ok } from "@/lib/api-response";
import { requireApprovedCreator } from "@/lib/auth/creator-guard";
import { toErrorResponse } from "@/lib/errors";
import { getCreatorMissionDetail } from "@/lib/services/creator-mission.service";

type Props = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, { params }: Props) {
  try {
    const account = await requireApprovedCreator(request);
    const { id } = await params;
    return ok(await getCreatorMissionDetail(account.id, id));
  } catch (error) {
    return toErrorResponse(error);
  }
}
