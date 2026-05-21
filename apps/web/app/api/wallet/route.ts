import { NextRequest } from "next/server";
import { ok } from "@/lib/api-response";
import { AppError, toErrorResponse } from "@/lib/errors";
import { getWalletByUser } from "@/lib/services/wallet.service";

export async function GET(request: NextRequest) {
  try {
    const userId = request.nextUrl.searchParams.get("userId") ?? "";
    if (!userId) {
      throw new AppError("Missing userId", 422, "VALIDATION_ERROR");
    }

    const data = await getWalletByUser(userId);
    return ok(data);
  } catch (error) {
    return toErrorResponse(error);
  }
}