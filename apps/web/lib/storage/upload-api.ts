import { AppError } from "@/lib/errors";
import { saveUploadAsset, type StoredUpload, type UploadFolder } from "@/lib/storage/upload";

export const IMAGE_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
export const DOCUMENT_MIME_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "text/plain"
] as const;

type UploadKind = "image" | "document";

type PickFileInput = {
  formData: FormData;
  fieldNames: string[];
  label: string;
};

type ValidateInput = {
  file: File | null;
  label: string;
  allowedTypes: readonly string[];
  maxSizeBytes: number;
  invalidTypeMessage: string;
};

type UploadValidatedInput = ValidateInput & {
  folder: UploadFolder;
  suffix: string;
  ownerId?: string;
};

const EMPTY_FILE_SIZE = 0;

export function pickUploadFile({ formData, fieldNames, label }: PickFileInput) {
  for (const fieldName of fieldNames) {
    const value = formData.get(fieldName);
    if (value instanceof File && value.size > EMPTY_FILE_SIZE) return value;
  }

  console.warn(`[upload] FILE_REQUIRED: ${label}; expected fields=${fieldNames.join(",")}`);
  throw new AppError(`Thiếu file ${label}`, 422, "FILE_REQUIRED", { fields: fieldNames });
}

export function validateUploadFile(input: ValidateInput): File {
  const { file, label, allowedTypes, maxSizeBytes, invalidTypeMessage } = input;
  if (!file || file.size <= EMPTY_FILE_SIZE) {
    console.warn(`[upload] FILE_REQUIRED: ${label}`);
    throw new AppError(`Thiếu file ${label}`, 422, "FILE_REQUIRED");
  }
  if (!allowedTypes.includes(file.type)) {
    console.warn(`[upload] INVALID_FILE_TYPE: ${label}; type=${file.type || "unknown"}; name=${file.name}`);
    throw new AppError(invalidTypeMessage, 422, "INVALID_FILE_TYPE", {
      mimeType: file.type,
      allowedTypes
    });
  }
  if (file.size > maxSizeBytes) {
    console.warn(`[upload] FILE_TOO_LARGE: ${label}; size=${file.size}; max=${maxSizeBytes}; name=${file.name}`);
    throw new AppError(`${label} vượt quá ${Math.floor(maxSizeBytes / 1024 / 1024)}MB`, 422, "FILE_TOO_LARGE", {
      size: file.size,
      maxSizeBytes
    });
  }
  return file;
}

export async function uploadValidatedFile(input: UploadValidatedInput): Promise<StoredUpload> {
  const file = validateUploadFile(input);
  return saveUploadAsset({
    file,
    folder: input.folder,
    suffix: input.suffix,
    ownerId: input.ownerId
  });
}

export function uploadResponse(upload: StoredUpload, aliases: Record<string, string> = {}) {
  return {
    ...aliases,
    url: upload.url,
    path: upload.path,
    filename: upload.filename,
    mimeType: upload.mimeType,
    size: upload.size
  };
}

export function uploadKindLabel(kind: UploadKind) {
  return kind === "image" ? "image/jpeg,image/png,image/webp" : DOCUMENT_MIME_TYPES.join(",");
}
