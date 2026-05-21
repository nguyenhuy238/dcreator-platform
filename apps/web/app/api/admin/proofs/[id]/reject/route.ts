import { NextRequest } from "next/server";
import { ok } from "@/lib/api-response";
import { requireAnyRole } from "@/lib/auth/guard";
import { toErrorResponse } from "@/lib/errors";
import { rejectProof } from "@/lib/services/mission.service";
import { adminProofRejectSchema } from "@/lib/validators";

type Props = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, { params }: Props) {
  try {
    const account = await requireAnyRole(request, ["ADMIN", "OPS"]);
    const payload = adminProofRejectSchema.parse(await request.json());
    const { id } = await params;
    return ok(await rejectProof(id, account.id, account.role, payload.rejectReason, payload.note));
  } catch (error) {
    return toErrorResponse(error);
  }
}
