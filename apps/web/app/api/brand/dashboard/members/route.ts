import { NextRequest } from "next/server";
import { DELETE_members, GET_members, PATCH_members, POST_members, withHandler } from "@/app/api/brand/dashboard/handlers";

export async function GET(request: NextRequest) {
  return withHandler(() => GET_members(request));
}

export async function POST(request: NextRequest) {
  return withHandler(() => POST_members(request));
}

export async function PATCH(request: NextRequest) {
  return withHandler(() => PATCH_members(request));
}

export async function DELETE(request: NextRequest) {
  return withHandler(() => DELETE_members(request));
}
