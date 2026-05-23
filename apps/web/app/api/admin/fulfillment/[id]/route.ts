import { NextRequest } from "next/server";
import { ok } from "@/lib/api-response";
import { requireAdminOps } from "@/lib/auth/admin-guard";
import { toErrorResponse } from "@/lib/errors";
import { getFulfillmentDetailForAdmin } from "@/lib/services/admin-fulfillment.service";

type Props = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, { params }: Props) {
  try {
    await requireAdminOps(request);
    const { id } = await params;
    return ok(await getFulfillmentDetailForAdmin(id));
  } catch (error) {
    return toErrorResponse(error);
  }
}

