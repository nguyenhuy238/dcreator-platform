import { NextRequest } from "next/server";
import { POST_proof_decision, withHandler } from "@/app/api/admin/dashboard/handlers";
type Props = { params: Promise<{ id: string }> };
export async function POST(request: NextRequest, { params }: Props) { return withHandler(async () => POST_proof_decision(request, (await params).id)); }
