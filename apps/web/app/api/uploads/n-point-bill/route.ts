import { NextRequest } from "next/server";
import { ok } from "@/lib/api-response";
import { assertSameOrigin } from "@/lib/auth/csrf";
import { requireAuth } from "@/lib/auth/guard";
import { AppError, toErrorResponse } from "@/lib/errors";
import { saveUpload } from "@/lib/storage/upload";

export const runtime = "nodejs";

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "application/pdf"];

function ensureFile(file: File | null): asserts file is File {
  if (!file) throw new AppError("Thiếu file biên lai", 422, "FILE_REQUIRED");
  if (!ALLOWED_TYPES.includes(file.type)) {
    throw new AppError("Biên lai phải là ảnh JPG/PNG/WebP hoặc PDF", 422, "INVALID_FILE_TYPE");
  }
  if (file.size > MAX_FILE_SIZE_BYTES) {
    throw new AppError("File biên lai vượt quá 10MB", 422, "FILE_TOO_LARGE");
  }
}

export async function POST(request: NextRequest) {
  try {
    assertSameOrigin(request);
    await requireAuth(request);

    const formData = await request.formData();
    const bill = formData.get("bill");
    const file = bill instanceof File ? bill : null;
    ensureFile(file);

    const billUrl = await saveUpload({
      file,
      folder: "n-point-bill",
      suffix: "npoint-bill",
      ext: file.type.split("/")[1] || "bin"
    });

    return ok({ billUrl }, 201);
  } catch (error) {
    return toErrorResponse(error);
  }
}
