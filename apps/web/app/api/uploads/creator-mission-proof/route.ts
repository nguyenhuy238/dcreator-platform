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
    const screenshotFile = pickUploadFile({
      formData,
      fieldNames: ["screenshot", "file", "image", "proof"],
      label: "screenshot proof"
    });

    const upload = await uploadValidatedFile({
      file: screenshotFile,
      folder: "creator-mission-proof",
      suffix: `mission-proof-${account.id}`,
      ownerId: account.id,
      label: "Screenshot proof",
      allowedTypes: IMAGE_MIME_TYPES,
      maxSizeBytes: MAX_FILE_SIZE_BYTES,
      invalidTypeMessage: "Screenshot proof chỉ hỗ trợ JPG, PNG hoặc WEBP"
    });

    return ok(uploadResponse(upload, { screenshotUrl: upload.url }), 201);
  } catch (error) {
    return toErrorResponse(error);
  }
}
