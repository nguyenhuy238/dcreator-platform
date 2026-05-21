import { NextRequest } from "next/server";
import { ok } from "@/lib/api-response";
import { assertApiRateLimit } from "@/lib/api/middleware";
import { requireApprovedCreator } from "@/lib/auth/creator-guard";
import { toErrorResponse } from "@/lib/errors";
import { submitCreatorProof } from "@/lib/services/creator-dashboard.service";
import { creatorProofSubmissionSchema } from "@/lib/validators/creator-dashboard";

type Props = { params: Promise<{ submissionId: string }> };

export async function POST(request: NextRequest, { params }: Props) {
  try {
    const account = await requireApprovedCreator(request);
    assertApiRateLimit(request, "proof_submit", account.id);
    const payload = creatorProofSubmissionSchema.parse(await request.json());
    const { submissionId } = await params;
    return ok(await submitCreatorProof(submissionId, account.id, payload));
  } catch (error) {
    return toErrorResponse(error);
  }
}
