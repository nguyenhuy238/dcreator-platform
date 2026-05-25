import { NextRequest } from "next/server";
import { POST_npoint_topup_approve, withHandler } from "@/app/api/admin/dashboard/handlers";

type Props = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, { params }: Props) {
  return withHandler(async () => POST_npoint_topup_approve(request, (await params).id));
}
