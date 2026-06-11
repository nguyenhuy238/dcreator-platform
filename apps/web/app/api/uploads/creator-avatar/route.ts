import { NextRequest } from "next/server";
import { ok } from "@/lib/api-response";
import { assertSameOrigin } from "@/lib/auth/csrf";
import { requireAuth } from "@/lib/auth/guard";
import { toErrorResponse } from "@/lib/errors";
import { IMAGE_MIME_TYPES, pickUploadFile, uploadResponse, uploadValidatedFile } from "@/lib/storage/upload-api";

export const runtime = "nodejs";

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;

export async function POST(request: NextRequest) {
  try {
    assertSameOrigin(request);
    const account = await requireAuth(request);

    const formData = await request.formData();
    const avatarFile = pickUploadFile({
      formData,
      fieldNames: ["avatar", "file", "image"],
      label: "ảnh đại diện creator"
    });

    const upload = await uploadValidatedFile({
      file: avatarFile,
      folder: "creator-avatar",
      suffix: `avatar-${account.id}`,
      ownerId: account.id,
      label: "Ảnh đại diện creator",
      allowedTypes: IMAGE_MIME_TYPES,
      maxSizeBytes: MAX_FILE_SIZE_BYTES,
      invalidTypeMessage: "Ảnh đại diện creator chỉ hỗ trợ JPG, PNG hoặc WEBP"
    });

    return ok(uploadResponse(upload, { avatarUrl: upload.url }), 201);
  } catch (error) {
    return toErrorResponse(error);
  }
}
