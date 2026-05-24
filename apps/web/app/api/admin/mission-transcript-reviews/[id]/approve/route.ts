import { NextRequest } from "next/server";
import { ok } from "@/lib/api-response";
import { requireAdminOps } from "@/lib/auth/admin-guard";
import { toErrorResponse } from "@/lib/errors";
import { approveMissionTranscriptReviewByAdmin } from "@/lib/services/creator-mission.service";

type Props = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, { params }: Props) {
  try {
    const actor = await requireAdminOps(request);
    const { id } = await params;
    return ok(await approveMissionTranscriptReviewByAdmin(actor.id, id));
  } catch (error) {
    return toErrorResponse(error);
  }
}
