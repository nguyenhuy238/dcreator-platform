import { NextRequest } from "next/server";
import { ok } from "@/lib/api-response";
import { assertSameOrigin } from "@/lib/auth/csrf";
import { requireBrandActor } from "@/lib/auth/brand-guard";
import { toErrorResponse } from "@/lib/errors";
import { DOCUMENT_MIME_TYPES, pickUploadFile, uploadResponse, uploadValidatedFile } from "@/lib/storage/upload-api";

export const runtime = "nodejs";

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;

export async function POST(request: NextRequest) {
  try {
    assertSameOrigin(request);
    const account = await requireBrandActor(request);

    const formData = await request.formData();
    const file = pickUploadFile({
      formData,
      fieldNames: ["file", "brief", "campaignFile", "contentFile", "contractDocument", "attachment", "template"],
      label: "file campaign"
    });

    const upload = await uploadValidatedFile({
      file,
      folder: "campaign-file",
      suffix: "campaign-file",
      ownerId: account.currentBrandId,
      label: "File campaign",
      allowedTypes: DOCUMENT_MIME_TYPES,
      maxSizeBytes: MAX_FILE_SIZE_BYTES,
      invalidTypeMessage: "File campaign chỉ hỗ trợ PDF, DOC, DOCX, XLS, XLSX, PPT, PPTX hoặc TXT"
    });

    return ok(uploadResponse(upload, { fileUrl: upload.url, contentFileUrl: upload.url, contractDocumentUrl: upload.url }), 201);
  } catch (error) {
    return toErrorResponse(error);
  }
}
