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
    const payload = (await request.json().catch(() => ({}))) as {
      shipping?: {
        recipientName?: string;
        phone?: string;
        province?: string;
        district?: string;
        ward?: string;
        addressLine?: string;
        note?: string;
      };
    };
    return ok(await confirmDepositPaid(id, account.id, payload.shipping));
  } catch (error) {
    return toErrorResponse(error);
  }
}
