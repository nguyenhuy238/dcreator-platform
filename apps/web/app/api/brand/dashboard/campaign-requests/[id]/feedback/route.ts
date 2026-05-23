import { NextRequest } from "next/server";
import { POST_campaign_request_feedback, withHandler } from "@/app/api/brand/dashboard/handlers";

type Props = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, { params }: Props) {
  return withHandler(async () => {
    const { id } = await params;
    return POST_campaign_request_feedback(request, id);
  });
}
