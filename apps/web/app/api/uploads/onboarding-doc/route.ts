import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { NextRequest } from "next/server";
import { ok } from "@/lib/api-response";
import { assertSameOrigin } from "@/lib/auth/csrf";
import { requireAuth } from "@/lib/auth/guard";
import { AppError, toErrorResponse } from "@/lib/errors";

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
  const buffer = Buffer.from(await file.arrayBuffer());
  const ext = file.type.split("/")[1] || "bin";
  const fileName = `${Date.now()}-${randomUUID()}-${suffix}.${ext}`;
  const relativeDir = path.join("uploads", "onboarding-doc");
  const absoluteDir = path.join(process.cwd(), "public", relativeDir);
  await mkdir(absoluteDir, { recursive: true });
  await writeFile(path.join(absoluteDir, fileName), buffer);
  return `/${relativeDir.replace(/\\/g, "/")}/${fileName}`;
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
