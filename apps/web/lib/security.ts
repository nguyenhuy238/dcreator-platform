import { createHash, timingSafeEqual } from "node:crypto";
import { NextRequest } from "next/server";
import { AppError } from "@/lib/errors";

const API_KEY_HEADER = "x-dcreator-api-key";

function safeEquals(a: string, b: string) {
  const aHash = createHash("sha256").update(a).digest();
  const bHash = createHash("sha256").update(b).digest();
  return timingSafeEqual(aHash, bHash);
}

export function assertInternalApiKey(request: NextRequest) {
  const expectedKey = process.env.INTERNAL_API_KEY;
  if (!expectedKey) {
    return;
  }

  const provided = request.headers.get(API_KEY_HEADER);
  if (!provided || !safeEquals(provided, expectedKey)) {
    throw new AppError("Unauthorized", 401, "UNAUTHORIZED");
  }
}

export function maskEmail(email: string) {
  const [name, domain] = email.split("@");
  if (!name || !domain) return "***";
  return `${name.slice(0, 2)}***@${domain}`;
}