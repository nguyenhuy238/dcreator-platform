import { NextRequest } from "next/server";
import { ok } from "@/lib/api-response";
import { requireAuth } from "@/lib/auth/guard";
import { toErrorResponse } from "@/lib/errors";
import { getWalletMe } from "@/lib/services/wallet.service";

export async function GET(request: NextRequest) {
  try {
    const account = await requireAuth(request);
    const data = await getWalletMe(account.id);
    return ok(data);
  } catch (error) {
    return toErrorResponse(error);
  }
}
