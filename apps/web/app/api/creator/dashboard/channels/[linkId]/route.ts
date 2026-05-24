import { NextRequest } from "next/server";
import { ok } from "@/lib/api-response";
import { requireApprovedCreator } from "@/lib/auth/creator-guard";
import { toErrorResponse } from "@/lib/errors";
import { removeCreatorChannel } from "@/lib/services/creator-dashboard.service";

type Props = { params: Promise<{ linkId: string }> };

export async function DELETE(request: NextRequest, { params }: Props) {
  try {
    const account = await requireApprovedCreator(request);
    const { linkId } = await params;
    return ok(await removeCreatorChannel(account.id, linkId));
  } catch (error) {
    return toErrorResponse(error);
  }
}
