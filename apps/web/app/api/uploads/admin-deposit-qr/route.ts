import { NextRequest } from "next/server";
import { ok } from "@/lib/api-response";
import { assertSameOrigin } from "@/lib/auth/csrf";
import { requireAuth } from "@/lib/auth/guard";
import { hasRole } from "@/lib/auth/dashboard-access";
import { DASHBOARD_ACCESS } from "@/lib/auth/role-constants";
import { AppError, toErrorResponse } from "@/lib/errors";
import { IMAGE_MIME_TYPES, pickUploadFile, uploadResponse, uploadValidatedFile } from "@/lib/storage/upload-api";

export const runtime = "nodejs";

const MAX_FILE_SIZE_BYTES = 3 * 1024 * 1024;

export async function POST(request: NextRequest) {
  try {
    assertSameOrigin(request);
    const user = await requireAuth(request);
    if (!hasRole(user.roles, DASHBOARD_ACCESS.admin)) {
      throw new AppError("Forbidden", 403, "FORBIDDEN");
    }

    const formData = await request.formData();
    const file = pickUploadFile({
      formData,
      fieldNames: ["qr", "image", "file", "depositQr"],
      label: "QR đặt cọc"
    });

    const upload = await uploadValidatedFile({
      file,
      folder: "admin-settings",
      suffix: "creator-deposit-qr",
      label: "QR đặt cọc",
      allowedTypes: IMAGE_MIME_TYPES,
      maxSizeBytes: MAX_FILE_SIZE_BYTES,
      invalidTypeMessage: "QR đặt cọc chỉ hỗ trợ JPG, PNG hoặc WEBP"
    });

    return ok(uploadResponse(upload, { qrImageUrl: upload.url }), 201);
  } catch (error) {
    return toErrorResponse(error);
  }
}
