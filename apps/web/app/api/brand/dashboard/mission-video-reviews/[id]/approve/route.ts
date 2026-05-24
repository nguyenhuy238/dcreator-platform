import { NextRequest } from "next/server";
import { ok } from "@/lib/api-response";
import { requireBrandActor } from "@/lib/auth/brand-guard";
import { toErrorResponse } from "@/lib/errors";
import { approveMissionVideoReviewByBrand } from "@/lib/services/creator-mission.service";

type Props = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, { params }: Props) {
  try {
    const actor = await requireBrandActor(request);
    const { id } = await params;
    return ok(await approveMissionVideoReviewByBrand(actor.id, id));
  } catch (error) {
    return toErrorResponse(error);
  }
}
