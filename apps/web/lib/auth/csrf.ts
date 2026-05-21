import { NextRequest } from "next/server";
import { AppError } from "@/lib/errors";

export function assertSameOrigin(request: NextRequest) {
  const origin = request.headers.get("origin");
  if (!origin) return;

  const host = request.headers.get("host");
  if (!host) {
    throw new AppError("Forbidden", 403, "CSRF_FORBIDDEN");
  }

  const expectedOrigin = `${request.nextUrl.protocol}//${host}`;
  if (origin !== expectedOrigin) {
    throw new AppError("Forbidden", 403, "CSRF_FORBIDDEN");
  }
}
