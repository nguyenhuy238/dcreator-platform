import { NextRequest } from "next/server";
import { GET_campaign_review_detail, withHandler } from "@/app/api/admin/dashboard/handlers";

type Props = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, { params }: Props) {
  return withHandler(async () => GET_campaign_review_detail(request, (await params).id));
}
