import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { fail } from "@/lib/api-response";

export class AppError extends Error {
  statusCode: number;
  code?: string;
  details?: unknown;

  constructor(message: string, statusCode = 400, code?: string, details?: unknown) {
    super(message);
    this.name = "AppError";
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }
}

export function toErrorResponse(error: unknown): NextResponse {
  if (error instanceof AppError) {
    return fail(error.message, error.statusCode, error.code, error.details);
  }

  if (error instanceof ZodError) {
    return fail("Kiểm tra dữ liệu thất bại", 422, "VALIDATION_ERROR", error.flatten());
  }

  return fail("Lỗi hệ thống nội bộ", 500, "INTERNAL_ERROR");
}
