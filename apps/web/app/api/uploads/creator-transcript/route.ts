import { NextRequest } from "next/server";
import { ok } from "@/lib/api-response";
import { assertSameOrigin } from "@/lib/auth/csrf";
import { requireApprovedCreator } from "@/lib/auth/creator-guard";
import { AppError, toErrorResponse } from "@/lib/errors";
import { saveUpload } from "@/lib/storage/upload";

export const runtime = "nodejs";

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;
const ALLOWED_TYPES = [
  "text/plain",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
];

function ensureTranscriptFile(file: File | null): asserts file is File {
  if (!file) throw new AppError("Thiếu file kịch bản", 422, "FILE_REQUIRED");
  if (!ALLOWED_TYPES.includes(file.type)) {
    throw new AppError("File kịch bản phải là TXT, PDF, DOC hoặc DOCX", 422, "INVALID_FILE_TYPE");
  }
  if (file.size > MAX_FILE_SIZE_BYTES) {
    throw new AppError("File kịch bản vượt quá 10MB", 422, "FILE_TOO_LARGE");
  }
}

export async function POST(request: NextRequest) {
  try {
    assertSameOrigin(request);
    const account = await requireApprovedCreator(request);

    const formData = await request.formData();
    const transcript = formData.get("transcript");
    const transcriptFile = transcript instanceof File ? transcript : null;
    ensureTranscriptFile(transcriptFile);

    const transcriptFileUrl = await saveUpload({
      file: transcriptFile,
      folder: "creator-transcript",
      suffix: `mission-transcript-${account.id}`,
      ext: transcriptFile.type.split("/")[1] || "bin"
    });

    return ok({ transcriptFileUrl }, 201);
  } catch (error) {
    return toErrorResponse(error);
  }
}
