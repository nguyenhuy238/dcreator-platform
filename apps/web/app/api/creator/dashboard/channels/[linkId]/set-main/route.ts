import { NextRequest } from "next/server";
import { ok } from "@/lib/api-response";
import { requireApprovedCreator } from "@/lib/auth/creator-guard";
import { assertSameOrigin } from "@/lib/auth/csrf";
import { toErrorResponse } from "@/lib/errors";
import { setCreatorChannelActiveStatus } from "@/lib/services/creator-dashboard.service";

type Props = { params: Promise<{ linkId: string }> };

export async function POST(request: NextRequest, { params }: Props) {
  try {
    assertSameOrigin(request);
    const account = await requireApprovedCreator(request);
    const { linkId } = await params;
    return ok(await setCreatorChannelActiveStatus(account.id, linkId, true));
  } catch (error) {
    return toErrorResponse(error);
  }
}
