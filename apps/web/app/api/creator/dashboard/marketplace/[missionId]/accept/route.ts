import { NextRequest } from "next/server";
import { ok } from "@/lib/api-response";
import { requireApprovedCreator } from "@/lib/auth/creator-guard";
import { toErrorResponse } from "@/lib/errors";
import { acceptCreatorMarketplaceJob } from "@/lib/services/creator-dashboard.service";

type Props = { params: Promise<{ missionId: string }> };

export async function POST(request: NextRequest, { params }: Props) {
  try {
    const account = await requireApprovedCreator(request);
    const { missionId } = await params;
    return ok(await acceptCreatorMarketplaceJob(missionId, account.id), 201);
  } catch (error) {
    return toErrorResponse(error);
  }
}
