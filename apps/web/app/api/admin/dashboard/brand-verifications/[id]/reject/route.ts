import { NextRequest } from "next/server";
import { POST_brand_verification_reject, withHandler } from "@/app/api/admin/dashboard/handlers";
type Props = { params: Promise<{ id: string }> };
export async function POST(request: NextRequest, { params }: Props) { return withHandler(async () => POST_brand_verification_reject(request, (await params).id)); }
