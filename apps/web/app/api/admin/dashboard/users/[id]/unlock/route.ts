import { NextRequest } from "next/server";
import { POST_user_unlock, withHandler } from "@/app/api/admin/dashboard/handlers";
type Props = { params: Promise<{ id: string }> };
export async function POST(request: NextRequest, { params }: Props) { return withHandler(async () => POST_user_unlock(request, (await params).id)); }
