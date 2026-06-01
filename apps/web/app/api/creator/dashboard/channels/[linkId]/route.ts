import { NextRequest } from "next/server";
import { ok } from "@/lib/api-response";
import { requireApprovedCreator } from "@/lib/auth/creator-guard";
import { assertSameOrigin } from "@/lib/auth/csrf";
import { toErrorResponse } from "@/lib/errors";
import { removeCreatorChannel, setCreatorChannelActiveStatus, updateCreatorChannel } from "@/lib/services/creator-dashboard.service";
import { creatorChannelsUpdateSchema, creatorChannelStatusUpdateSchema } from "@/lib/validators/creator-dashboard";

type Props = { params: Promise<{ linkId: string }> };

export async function DELETE(request: NextRequest, { params }: Props) {
  try {
    assertSameOrigin(request);
    const account = await requireApprovedCreator(request);
    const { linkId } = await params;
    return ok(await removeCreatorChannel(account.id, linkId));
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function PATCH(request: NextRequest, { params }: Props) {
  try {
    assertSameOrigin(request);
    const account = await requireApprovedCreator(request);
    const { linkId } = await params;
    const raw = await request.json();
    if (typeof raw === "object" && raw !== null && "isActive" in raw) {
      const payload = creatorChannelStatusUpdateSchema.parse(raw);
      return ok(await setCreatorChannelActiveStatus(account.id, linkId, payload.isActive));
    }
    const payload = creatorChannelsUpdateSchema.parse(raw);
    return ok(await updateCreatorChannel(account.id, linkId, payload));
  } catch (error) {
    return toErrorResponse(error);
  }
}
