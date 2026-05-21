import { NextRequest } from "next/server";
import { ok } from "@/lib/api-response";
import { requireAuth } from "@/lib/auth/guard";
import { toErrorResponse } from "@/lib/errors";
import { getVoucherByCodeForUser } from "@/lib/services/voucher.service";

type Props = { params: Promise<{ code: string }> };

export async function GET(request: NextRequest, { params }: Props) {
  try {
    const account = await requireAuth(request);
    const { code } = await params;
    return ok(await getVoucherByCodeForUser(code, account.id));
  } catch (error) {
    return toErrorResponse(error);
  }
}
