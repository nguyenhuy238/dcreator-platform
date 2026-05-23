import { NextRequest } from "next/server";
import { ok } from "@/lib/api-response";
import { requireAuth } from "@/lib/auth/guard";
import { toErrorResponse } from "@/lib/errors";
import { listMyContributions } from "@/lib/services/contribution.service";

export async function GET(request: NextRequest) {
  try {
    const account = await requireAuth(request);
    return ok(await listMyContributions(account.id));
  } catch (error) {
    return toErrorResponse(error);
  }
}

