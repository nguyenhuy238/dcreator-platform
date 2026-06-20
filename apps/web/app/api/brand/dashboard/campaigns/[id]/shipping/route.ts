import { NextRequest } from "next/server";
import { GET_campaign_shipping, POST_campaign_shipping_shipped, withHandler } from "@/app/api/brand/dashboard/handlers";

type Props = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, { params }: Props) {
  return withHandler(async () => {
    const { id } = await params;
    return GET_campaign_shipping(request, id);
  });
}

export async function POST(request: NextRequest, { params }: Props) {
  return withHandler(async () => {
    const { id } = await params;
    return POST_campaign_shipping_shipped(request, id);
  });
}
