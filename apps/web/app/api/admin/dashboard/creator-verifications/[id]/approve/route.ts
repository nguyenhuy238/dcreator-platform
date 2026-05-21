import { NextRequest } from "next/server";
import { POST_creator_verification_approve, withHandler } from "@/app/api/admin/dashboard/handlers";
type Props = { params: Promise<{ id: string }> };
export async function POST(request: NextRequest, { params }: Props) { return withHandler(async () => POST_creator_verification_approve(request, (await params).id)); }
