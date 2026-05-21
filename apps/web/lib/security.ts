import { NextRequest } from "next/server";
import { AppError } from "./errors";

const API_KEY_HEADER = "x-dcreator-api-key";

export function assertInternalApiKey(request: NextRequest) {
  const expectedKey = process.env.INTERNAL_API_KEY;
  if (!expectedKey) {
    return;
  }

  const provided = request.headers.get(API_KEY_HEADER);
  if (!provided || provided !== expectedKey) {
    throw new AppError("Unauthorized", 401);
  }
}
