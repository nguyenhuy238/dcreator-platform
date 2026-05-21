import { NextRequest } from "next/server";
import { ok } from "@/lib/api-response";
import { requireAuth } from "@/lib/auth/guard";
import { toErrorResponse } from "@/lib/errors";
import { acceptMission } from "@/lib/services/mission.service";

type Props = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, { params }: Props) {
  try {
    const account = await requireAuth(request);
    const { id } = await params;
    return ok(await acceptMission(id, account.id, account.role), 201);
  } catch (error) {
    return toErrorResponse(error);
  }
}
