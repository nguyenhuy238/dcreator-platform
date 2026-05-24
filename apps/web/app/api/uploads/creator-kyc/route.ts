import { NextRequest } from "next/server";
import { ok } from "@/lib/api-response";
import { assertSameOrigin } from "@/lib/auth/csrf";
import { requireAuth } from "@/lib/auth/guard";
import { AppError, toErrorResponse } from "@/lib/errors";
import { saveUpload } from "@/lib/storage/upload";

export const runtime = "nodejs";

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;

function ensureImage(file: File | null, label: string): asserts file is File {
  if (!file) throw new AppError(`Thiếu file ${label}`, 422, "FILE_REQUIRED");
  if (!file.type.startsWith("image/")) {
    throw new AppError(`${label} phải là file ảnh`, 422, "INVALID_FILE_TYPE");
  }
  if (file.size > MAX_FILE_SIZE_BYTES) {
    throw new AppError(`${label} vượt quá 5MB`, 422, "FILE_TOO_LARGE");
  }
}

async function saveImage(file: File, suffix: string) {
  return saveUpload({
    file,
    folder: "creator-kyc",
    suffix,
    ext: file.type.split("/")[1] || "jpg"
  });
}

export async function POST(request: NextRequest) {
  try {
    assertSameOrigin(request);
    await requireAuth(request);

    const formData = await request.formData();
    const idCardFrontImage = formData.get("idCardFrontImage");
    const idCardBackImage = formData.get("idCardBackImage");
    const portraitImage = formData.get("portraitImage");

    const idCardFrontFile = idCardFrontImage instanceof File ? idCardFrontImage : null;
    const idCardBackFile = idCardBackImage instanceof File ? idCardBackImage : null;
    const portraitFile = portraitImage instanceof File ? portraitImage : null;

    ensureImage(idCardFrontFile, "ảnh CCCD mặt trước");
    ensureImage(idCardBackFile, "ảnh CCCD mặt sau");
    ensureImage(portraitFile, "ảnh chân dung");

    const [idCardFrontImageUrl, idCardBackImageUrl, portraitImageUrl] = await Promise.all([
      saveImage(idCardFrontFile, "id-card-front"),
      saveImage(idCardBackFile, "id-card-back"),
      saveImage(portraitFile, "portrait")
    ]);

    return ok({ idCardFrontImageUrl, idCardBackImageUrl, portraitImageUrl }, 201);
  } catch (error) {
    return toErrorResponse(error);
  }
}
