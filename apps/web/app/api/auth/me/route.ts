import { NextRequest } from "next/server";
import { ok } from "@/lib/api-response";
import { requireAuth } from "@/lib/auth/guard";
import { toErrorResponse } from "@/lib/errors";

export async function GET(request: NextRequest) {
  try {
    const account = await requireAuth(request);
    return ok(account);
  } catch (error) {
    return toErrorResponse(error);
  }
}
