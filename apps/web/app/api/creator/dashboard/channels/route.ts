import { NextRequest } from "next/server";
import { ok } from "@/lib/api-response";
import { requireApprovedCreator } from "@/lib/auth/creator-guard";
import { assertSameOrigin } from "@/lib/auth/csrf";
import { toErrorResponse } from "@/lib/errors";
import { createCreatorChannel, getCreatorChannels } from "@/lib/services/creator-dashboard.service";
import { creatorChannelsUpdateSchema } from "@/lib/validators/creator-dashboard";

export async function GET(request: NextRequest) {
  try {
    const account = await requireApprovedCreator(request);
    return ok(await getCreatorChannels(account.id));
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function PUT(request: NextRequest) {
  try {
    assertSameOrigin(request);
    const account = await requireApprovedCreator(request);
    const payload = creatorChannelsUpdateSchema.parse(await request.json());
    return ok(await createCreatorChannel(account.id, payload));
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    assertSameOrigin(request);
    const account = await requireApprovedCreator(request);
    const payload = creatorChannelsUpdateSchema.parse(await request.json());
    return ok(await createCreatorChannel(account.id, payload));
  } catch (error) {
    return toErrorResponse(error);
  }
}
