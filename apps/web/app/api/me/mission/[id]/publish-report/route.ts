import { NextRequest } from "next/server";
import { ok } from "@/lib/api-response";
import { requireApprovedCreator } from "@/lib/auth/creator-guard";
import { toErrorResponse } from "@/lib/errors";
import { submitPublishReport } from "@/lib/services/creator-mission.service";
import { creatorMissionPublishReportSchema } from "@/lib/validators/creator-mission";

type Props = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, { params }: Props) {
  try {
    const account = await requireApprovedCreator(request);
    const { id } = await params;
    const payload = creatorMissionPublishReportSchema.parse(await request.json());
    return ok(await submitPublishReport(id, account.id, payload));
  } catch (error) {
    return toErrorResponse(error);
  }
}
