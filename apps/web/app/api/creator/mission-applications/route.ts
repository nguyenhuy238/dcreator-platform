import { NextRequest } from "next/server";
import { ok } from "@/lib/api-response";
import { requireApprovedCreator } from "@/lib/auth/creator-guard";
import { toErrorResponse } from "@/lib/errors";
import {
  createMissionApplicationForCreator,
  listCreatorMissionApplicationsByAccount
} from "@/lib/services/creator-mission.service";
import { creatorMissionApplicationCreateSchema } from "@/lib/validators/mission-workflow";

export async function GET(request: NextRequest) {
  try {
    const account = await requireApprovedCreator(request);
    return ok(await listCreatorMissionApplicationsByAccount(account.id));
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const account = await requireApprovedCreator(request);
    const payload = creatorMissionApplicationCreateSchema.parse(await request.json());
    return ok(await createMissionApplicationForCreator(account.id, payload), 201);
  } catch (error) {
    return toErrorResponse(error);
  }
}
