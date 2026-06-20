import { NextRequest } from "next/server";
import { ok } from "@/lib/api-response";
import { assertSameOrigin } from "@/lib/auth/csrf";
import { requireBrandActor } from "@/lib/auth/brand-guard";
import { hasRole } from "@/lib/auth/dashboard-access";
import { requireAuth } from "@/lib/auth/guard";
import { DASHBOARD_ACCESS } from "@/lib/auth/role-constants";
import { toErrorResponse } from "@/lib/errors";
import { DOCUMENT_MIME_TYPES, pickUploadFile, uploadResponse, uploadValidatedFile } from "@/lib/storage/upload-api";

export const runtime = "nodejs";

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;

export async function POST(request: NextRequest) {
  try {
    assertSameOrigin(request);
    const authAccount = await requireAuth(request);
    const ownerId = hasRole(authAccount.roles, DASHBOARD_ACCESS.admin)
      ? authAccount.id
      : (await requireBrandActor(request)).currentBrandId;

    const formData = await request.formData();
    const file = pickUploadFile({
      formData,
      fieldNames: ["contractDocument", "file", "brief", "campaignFile", "attachment", "template"],
      label: "tài liệu campaign"
    });

    const upload = await uploadValidatedFile({
      file,
      folder: "onboarding-doc",
      suffix: "campaign-document",
      ownerId,
      label: "Tài liệu campaign",
      allowedTypes: DOCUMENT_MIME_TYPES,
      maxSizeBytes: MAX_FILE_SIZE_BYTES,
      invalidTypeMessage: "File campaign chỉ hỗ trợ PDF, DOC, DOCX, XLS, XLSX, PPT, PPTX hoặc TXT"
    });

    return ok(uploadResponse(upload, { contractDocumentUrl: upload.url }), 201);
  } catch (error) {
    return toErrorResponse(error);
  }
}
