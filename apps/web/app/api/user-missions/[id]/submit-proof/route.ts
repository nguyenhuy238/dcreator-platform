import { NextRequest } from "next/server";
import { ok } from "@/lib/api-response";
import { assertApiRateLimit } from "@/lib/api/middleware";
import { requireAuth } from "@/lib/auth/guard";
import { toErrorResponse } from "@/lib/errors";
import { submitMissionProof } from "@/lib/services/mission.service";
import { submitProofSchema } from "@/lib/validators";

type Props = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, { params }: Props) {
  try {
    const account = await requireAuth(request);
    assertApiRateLimit(request, "proof_submit", account.id);
    const payload = submitProofSchema.parse(await request.json());
    const { id } = await params;
    return ok(await submitMissionProof(id, account.id, payload));
  } catch (error) {
    return toErrorResponse(error);
  }
}
