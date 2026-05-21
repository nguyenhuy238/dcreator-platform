import { NextRequest } from "next/server";
import { ok } from "@/lib/api-response";
import { requireAuth } from "@/lib/auth/guard";
import { toErrorResponse } from "@/lib/errors";
import { redeemVoucher } from "@/lib/services/voucher.service";
import { voucherRedeemSchema } from "@/lib/validators";

type Props = { params: Promise<{ code: string }> };

export async function POST(request: NextRequest, { params }: Props) {
  try {
    const account = await requireAuth(request);
    const { code } = await params;
    const payload = voucherRedeemSchema.parse(await request.json());
    return ok(await redeemVoucher(code, account.id, payload.redemptionNote));
  } catch (error) {
    return toErrorResponse(error);
  }
}
