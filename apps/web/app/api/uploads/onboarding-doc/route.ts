import { NextRequest } from "next/server";
import { ok } from "@/lib/api-response";
import { assertSameOrigin } from "@/lib/auth/csrf";
import { requireAuth } from "@/lib/auth/guard";
import { AppError, toErrorResponse } from "@/lib/errors";
import { saveUpload } from "@/lib/storage/upload";

export const runtime = "nodejs";

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;
const ALLOWED_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "image/jpeg",
  "image/png",
  "text/plain"
];

function ensureDocument(file: File | null, label: string): asserts file is File {
  if (!file) throw new AppError(`Thiếu file ${label}`, 422, "FILE_REQUIRED");
  if (!ALLOWED_TYPES.includes(file.type)) {
    throw new AppError(`${label} phải là một file PDF, DOC, DOCX, JPG, PNG hoặc TXT`, 422, "INVALID_FILE_TYPE");
  }
  if (file.size > MAX_FILE_SIZE_BYTES) {
    throw new AppError(`${label} vượt quá 10MB`, 422, "FILE_TOO_LARGE");
  }
}

async function saveDocument(file: File, suffix: string) {
  return saveUpload({
    file,
    folder: "onboarding-doc",
    suffix,
    ext: file.type.split("/")[1] || "bin"
  });
}

export async function POST(request: NextRequest) {
  try {
    assertSameOrigin(request);
    await requireAuth(request);

    const formData = await request.formData();
    const contractDocument = formData.get("contractDocument");
    const contractFile = contractDocument instanceof File ? contractDocument : null;

    ensureDocument(contractFile, "Tài liệu hợp đồng / tài liệu bổ sung");

    const contractDocumentUrl = await saveDocument(contractFile, "onboarding-contract");
    return ok({ contractDocumentUrl }, 201);
  } catch (error) {
    return toErrorResponse(error);
  }
}
