import { NextRequest } from "next/server";
import { ok } from "@/lib/api-response";
import { requireAuth } from "@/lib/auth/guard";
import { toErrorResponse } from "@/lib/errors";
import { getWalletTransactions } from "@/lib/services/wallet.service";
import { walletTransactionQuerySchema } from "@/lib/validators";

export async function GET(request: NextRequest) {
  try {
    const account = await requireAuth(request);
    const parsed = walletTransactionQuerySchema.parse({
      page: request.nextUrl.searchParams.get("page") ?? undefined,
      limit: request.nextUrl.searchParams.get("limit") ?? undefined
    });
    const data = await getWalletTransactions(account.id, parsed.page, parsed.limit);
    return ok(data);
  } catch (error) {
    return toErrorResponse(error);
  }
}
