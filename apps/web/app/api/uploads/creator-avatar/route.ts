import { NextRequest } from "next/server";
import { ok } from "@/lib/api-response";
import { assertSameOrigin } from "@/lib/auth/csrf";
import { requireAuth } from "@/lib/auth/guard";
import { AppError, toErrorResponse } from "@/lib/errors";
import { saveUpload } from "@/lib/storage/upload";

export const runtime = "nodejs";

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;

function ensureImage(file: File | null): asserts file is File {
  if (!file) throw new AppError("Thiếu file ảnh đại diện", 422, "FILE_REQUIRED");
  if (!file.type.startsWith("image/")) {
    throw new AppError("Ảnh đại diện phải là file ảnh", 422, "INVALID_FILE_TYPE");
  }
  if (file.size > MAX_FILE_SIZE_BYTES) {
    throw new AppError("Ảnh đại diện vượt quá 5MB", 422, "FILE_TOO_LARGE");
  }
}

export async function POST(request: NextRequest) {
  try {
    assertSameOrigin(request);
    const account = await requireAuth(request);

    const formData = await request.formData();
    const avatar = formData.get("avatar");
    const avatarFile = avatar instanceof File ? avatar : null;

    ensureImage(avatarFile);

    const avatarUrl = await saveUpload({
      file: avatarFile,
      folder: "creator-avatar",
      suffix: `avatar-${account.id}`,
      ext: avatarFile.type.split("/")[1] || "jpg"
    });

    return ok({ avatarUrl }, 201);
  } catch (error) {
    return toErrorResponse(error);
  }
}
