import { NextRequest } from "next/server";
import { POST_campaign_decision, withHandler } from "@/app/api/admin/dashboard/handlers";
type Props = { params: Promise<{ id: string }> };
export async function POST(request: NextRequest, { params }: Props) { return withHandler(async () => POST_campaign_decision(request, (await params).id)); }
