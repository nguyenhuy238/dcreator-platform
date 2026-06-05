import { NextRequest } from "next/server";
import { ok } from "@/lib/api-response";
import { requireApprovedCreator } from "@/lib/auth/creator-guard";
import { toErrorResponse } from "@/lib/errors";
import { submitCreatorMissionTranscript } from "@/lib/services/creator-mission.service";
import { creatorMissionTranscriptSubmitSchema } from "@/lib/validators/mission-workflow";

type Props = { params: Promise<{ id: string }> };

async function handle(request: NextRequest, params: Props["params"]) {
  const account = await requireApprovedCreator(request);
  const payload = creatorMissionTranscriptSubmitSchema.parse(await request.json());
  const { id } = await params;
  return ok(await submitCreatorMissionTranscript(account.id, id, payload));
}

export async function POST(request: NextRequest, { params }: Props) {
  try {
    return await handle(request, params);
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function PATCH(request: NextRequest, { params }: Props) {
  try {
    return await handle(request, params);
  } catch (error) {
    return toErrorResponse(error);
  }
}
