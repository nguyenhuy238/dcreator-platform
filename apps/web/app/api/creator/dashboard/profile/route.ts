import { NextRequest } from "next/server";
import { ok } from "@/lib/api-response";
import { requireApprovedCreator } from "@/lib/auth/creator-guard";
import { toErrorResponse } from "@/lib/errors";
import { getCreatorProfile, updateCreatorProfile } from "@/lib/services/creator-dashboard.service";
import { creatorProfileUpdateSchema } from "@/lib/validators/creator-dashboard";

export async function GET(request: NextRequest) {
  try {
    const account = await requireApprovedCreator(request);
    return ok(await getCreatorProfile(account.id));
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function PUT(request: NextRequest) {
  try {
    const account = await requireApprovedCreator(request);
    const payload = creatorProfileUpdateSchema.parse(await request.json());
    return ok(await updateCreatorProfile(account.id, payload));
  } catch (error) {
    return toErrorResponse(error);
  }
}
