import { NextRequest } from "next/server";
import { ok } from "@/lib/api-response";
import { assertSameOrigin } from "@/lib/auth/csrf";
import { requireAuth } from "@/lib/auth/guard";
import { AppError, toErrorResponse } from "@/lib/errors";
import { saveUpload } from "@/lib/storage/upload";

export const runtime = "nodejs";

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/svg+xml"];

function ensureImage(file: File | null): asserts file is File {
  if (!file) throw new AppError("Thiếu file logo", 422, "FILE_REQUIRED");
  if (!ALLOWED_TYPES.includes(file.type)) {
    throw new AppError("Logo phải là JPG, PNG, WEBP hoặc SVG", 422, "INVALID_FILE_TYPE");
  }
  if (file.size > MAX_FILE_SIZE_BYTES) {
    throw new AppError("Logo vượt quá 5MB", 422, "FILE_TOO_LARGE");
  }
}

export async function POST(request: NextRequest) {
  try {
    assertSameOrigin(request);
    await requireAuth(request);

    const formData = await request.formData();
    const logoFile = formData.get("logo");
    const file = logoFile instanceof File ? logoFile : null;
    ensureImage(file);

    const logoUrl = await saveUpload({
      file,
      folder: "brand-logo",
      suffix: "brand-logo",
      ext: file.type.split("/")[1] || "png"
    });

    return ok({ logoUrl }, 201);
  } catch (error) {
    return toErrorResponse(error);
  }
}
