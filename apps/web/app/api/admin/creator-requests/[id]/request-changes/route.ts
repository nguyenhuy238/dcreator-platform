import { NextRequest } from "next/server";
import { requireAdminOps } from "@/lib/auth/admin-guard";
import { assertSameOrigin } from "@/lib/auth/csrf";
import { toErrorResponse } from "@/lib/errors";

type Props = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, { params }: Props) {
  try {
    assertSameOrigin(request);
    await requireAdminOps(request);
    const { id } = await params;
    return Response.json(
      { success: false, error: `request-changes is not supported for creator social link ${id}` },
      { status: 410 }
    );
  } catch (error) {
    return toErrorResponse(error);
  }
}
