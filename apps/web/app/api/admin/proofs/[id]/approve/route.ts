import { NextRequest } from "next/server";
import { ok } from "@/lib/api-response";
import { requireAnyRole } from "@/lib/auth/guard";
import { toErrorResponse } from "@/lib/errors";
import { approveProof } from "@/lib/services/mission.service";
import { adminProofApproveSchema } from "@/lib/validators";

type Props = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, { params }: Props) {
  try {
    const account = await requireAnyRole(request, ["ADMIN", "OPS"]);
    const payload = adminProofApproveSchema.parse(await request.json());
    const { id } = await params;
    return ok(await approveProof(id, account.id, account.role, payload.note));
  } catch (error) {
    return toErrorResponse(error);
  }
}
