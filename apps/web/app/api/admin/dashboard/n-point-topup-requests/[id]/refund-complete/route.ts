import { NextRequest } from "next/server";
import { POST_npoint_refund_complete, withHandler } from "@/app/api/admin/dashboard/handlers";

type Props = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, { params }: Props) {
  return withHandler(async () => POST_npoint_refund_complete(request, (await params).id));
}
