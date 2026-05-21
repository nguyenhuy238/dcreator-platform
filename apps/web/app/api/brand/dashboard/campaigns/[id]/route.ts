import { NextRequest } from "next/server";
import { PUT_campaign, withHandler } from "@/app/api/brand/dashboard/handlers";

type Props = { params: Promise<{ id: string }> };

export async function PUT(request: NextRequest, { params }: Props) {
  return withHandler(async () => {
    const { id } = await params;
    return PUT_campaign(request, id);
  });
}
