import { NextRequest } from "next/server";
import { ok } from "@/lib/api-response";
import { requireAdminOps } from "@/lib/auth/admin-guard";
import { toErrorResponse } from "@/lib/errors";
import { listSupportTicketsForAdmin } from "@/lib/services/admin-support.service";
import { adminSupportListQuerySchema } from "@/lib/validators/admin-support";

export async function GET(request: NextRequest) {
  try {
    await requireAdminOps(request);
    const parsed = adminSupportListQuerySchema.parse({
      status: request.nextUrl.searchParams.get("status") ?? undefined,
      priority: request.nextUrl.searchParams.get("priority") ?? undefined,
      category: request.nextUrl.searchParams.get("category") ?? undefined,
      assigneeId: request.nextUrl.searchParams.get("assigneeId") ?? undefined,
      query: request.nextUrl.searchParams.get("query") ?? undefined
    });
    return ok(await listSupportTicketsForAdmin(parsed));
  } catch (error) {
    return toErrorResponse(error);
  }
}

