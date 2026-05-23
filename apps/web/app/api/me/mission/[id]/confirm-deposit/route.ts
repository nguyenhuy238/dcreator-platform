import { NextRequest } from "next/server";
import { ok } from "@/lib/api-response";
import { requireApprovedCreator } from "@/lib/auth/creator-guard";
import { toErrorResponse } from "@/lib/errors";
import { confirmDepositPaid } from "@/lib/services/creator-mission.service";

type Props = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, { params }: Props) {
  try {
    const account = await requireApprovedCreator(request);
    const { id } = await params;
    return ok(await confirmDepositPaid(id, account.id));
  } catch (error) {
    return toErrorResponse(error);
  }
}
