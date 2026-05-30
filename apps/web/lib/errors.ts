import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { fail } from "@/lib/api-response";
import { AppError } from "@/lib/errors-core";

export { AppError } from "@/lib/errors-core";

export function toErrorResponse(error: unknown): NextResponse {
  if (error instanceof AppError) {
    return fail(error.message, error.statusCode, error.code, error.details);
  }

  if (error instanceof ZodError) {
    return fail("Kiểm tra dữ liệu thất bại", 422, "VALIDATION_ERROR", error.flatten());
  }

  return fail("Lỗi hệ thống nội bộ", 500, "INTERNAL_ERROR");
}
