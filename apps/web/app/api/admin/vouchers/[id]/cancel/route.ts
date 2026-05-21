import { NextRequest } from "next/server";
import { ok } from "@/lib/api-response";
import { requireAnyRole } from "@/lib/auth/guard";
import { toErrorResponse } from "@/lib/errors";
import { cancelVoucherByAdmin } from "@/lib/services/voucher.service";
import { voucherAdminCancelSchema } from "@/lib/validators";

type Props = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, { params }: Props) {
  try {
    const actor = await requireAnyRole(request, ["ADMIN", "OPS"]);
    const payload = voucherAdminCancelSchema.parse(await request.json());
    const { id } = await params;
    return ok(await cancelVoucherByAdmin(id, actor.id, payload.reason));
  } catch (error) {
    return toErrorResponse(error);
  }
}
