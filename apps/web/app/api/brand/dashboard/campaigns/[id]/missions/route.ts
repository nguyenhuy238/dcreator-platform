import { NextRequest } from "next/server";
import { GET_campaign_missions, POST_campaign_mission, withHandler } from "@/app/api/brand/dashboard/handlers";

type Props = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, { params }: Props) {
  return withHandler(async () => {
    const { id } = await params;
    return GET_campaign_missions(request, id);
  });
}

export async function POST(request: NextRequest, { params }: Props) {
  return withHandler(async () => {
    const { id } = await params;
    return POST_campaign_mission(request, id);
  });
}
