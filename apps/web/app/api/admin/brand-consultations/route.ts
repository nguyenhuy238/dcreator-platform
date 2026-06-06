import { NextRequest } from "next/server";
import { ok } from "@/lib/api-response";
import { requireAdminOps } from "@/lib/auth/admin-guard";
import { toErrorResponse } from "@/lib/errors";
import { listBrandConsultationsForAdmin } from "@/lib/services/brand-consultation.service";
import { brandConsultationListQuerySchema } from "@/lib/validators/brand-consultation";

export async function GET(request: NextRequest) {
  try {
    await requireAdminOps(request);
    const parsed = brandConsultationListQuerySchema.parse({
      query: request.nextUrl.searchParams.get("query") ?? undefined
    });
    return ok(await listBrandConsultationsForAdmin(parsed));
  } catch (error) {
    return toErrorResponse(error);
  }
}
