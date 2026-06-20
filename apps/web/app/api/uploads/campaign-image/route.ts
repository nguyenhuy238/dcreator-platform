import { NextRequest } from "next/server";
import { ok } from "@/lib/api-response";
import { assertSameOrigin } from "@/lib/auth/csrf";
import { requireBrandActor } from "@/lib/auth/brand-guard";
import { toErrorResponse } from "@/lib/errors";
import { IMAGE_MIME_TYPES, pickUploadFile, uploadResponse, uploadValidatedFile } from "@/lib/storage/upload-api";

export const runtime = "nodejs";

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;

export async function POST(request: NextRequest) {
  try {
    assertSameOrigin(request);
    const account = await requireBrandActor(request);

    const formData = await request.formData();
    const file = pickUploadFile({
      formData,
      fieldNames: ["image", "file", "coverImage", "campaignImage", "logo"],
      label: "ảnh campaign"
    });

    const upload = await uploadValidatedFile({
      file,
      folder: "campaign-image",
      suffix: "campaign-image",
      ownerId: account.currentBrandId,
      label: "Ảnh campaign",
      allowedTypes: IMAGE_MIME_TYPES,
      maxSizeBytes: MAX_FILE_SIZE_BYTES,
      invalidTypeMessage: "Ảnh campaign chỉ hỗ trợ JPG, PNG hoặc WEBP"
    });

    return ok(uploadResponse(upload, { imageUrl: upload.url, coverImageUrl: upload.url }), 201);
  } catch (error) {
    return toErrorResponse(error);
  }
}
