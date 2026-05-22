import { NextRequest } from "next/server";
import { ok } from "@/lib/api-response";
import { requireRole } from "@/lib/auth/guards";
import { DASHBOARD_ACCESS } from "@/lib/auth/role-constants";
import { toErrorResponse } from "@/lib/errors";
import { rejectProof } from "@/lib/services/mission.service";
import { adminProofRejectSchema } from "@/lib/validators";

type Props = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, { params }: Props) {
  try {
    const account = await requireRole(request, DASHBOARD_ACCESS.admin);
    const payload = adminProofRejectSchema.parse(await request.json());
    const { id } = await params;
    return ok(await rejectProof(id, account.id, account.role, payload.rejectReason, payload.note));
  } catch (error) {
    return toErrorResponse(error);
  }
}
