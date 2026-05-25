import { NextRequest } from "next/server";
import { POST_npoint_refund_info, withHandler } from "@/app/api/brand/dashboard/handlers";

type Props = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, { params }: Props) {
  return withHandler(async () => POST_npoint_refund_info(request, (await params).id));
}
