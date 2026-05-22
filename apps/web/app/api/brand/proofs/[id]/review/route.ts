import { NextRequest } from "next/server";
import { ok } from "@/lib/api-response";
import { requireRole } from "@/lib/auth/guards";
import { DASHBOARD_ACCESS } from "@/lib/auth/role-constants";
import { toErrorResponse } from "@/lib/errors";
import { reviewProofAsBrand } from "@/lib/services/mission.service";
import { brandProofReviewSchema } from "@/lib/validators";

type Props = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, { params }: Props) {
  try {
    const account = await requireRole(request, DASHBOARD_ACCESS.brand);
    const payload = brandProofReviewSchema.parse(await request.json());
    const { id } = await params;
    return ok(await reviewProofAsBrand(id, account.id, account.role, payload.decision, payload.rejectReason, payload.note));
  } catch (error) {
    return toErrorResponse(error);
  }
}
