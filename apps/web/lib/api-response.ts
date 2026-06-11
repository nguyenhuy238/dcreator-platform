import { NextResponse } from "next/server";

export type ApiSuccess<T> = {
  success: true;
  data: T;
};

export type ApiFailure = {
  success: false;
  error: string;
  message: string;
  code?: string;
  details?: unknown;
};

export function ok<T>(data: T, status = 200) {
  return NextResponse.json<ApiSuccess<T>>({ success: true, data }, { status });
}

export function fail(error: string, status = 400, code?: string, details?: unknown) {
  return NextResponse.json<ApiFailure>({ success: false, error, message: error, code, details }, { status });
}
