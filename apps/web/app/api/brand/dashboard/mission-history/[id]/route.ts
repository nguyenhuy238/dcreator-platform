import { NextRequest } from "next/server";
import { ok } from "@/lib/api-response";
import { requireBrandActor } from "@/lib/auth/brand-guard";
import { toErrorResponse } from "@/lib/errors";
import { getMissionHistoryDetailForBrand } from "@/lib/services/creator-mission.service";

type Props = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, { params }: Props) {
  try {
    const account = await requireBrandActor(request);
    const { id } = await params;
    return ok(await getMissionHistoryDetailForBrand(account.id, id));
  } catch (error) {
    return toErrorResponse(error);
  }
}
