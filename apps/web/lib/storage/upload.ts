import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { AppError } from "@/lib/errors";

export type UploadFolder =
  | "creator-kyc"
  | "brand-kyc"
  | "onboarding-doc"
  | "campaign-image"
  | "campaign-file"
  | "brand-logo"
  | "avatar"
  | "creator-avatar"
  | "creator-mission-proof"
  | "creator-transcript"
  | "n-point-bill"
  | "admin-settings";

type UploadInput = {
  file: File;
  folder: UploadFolder;
  suffix: string;
  ext?: string;
  ownerId?: string;
};

type TextUploadInput = {
  content: string;
  folder: UploadFolder;
  suffix: string;
  ext?: string;
  ownerId?: string;
};

export type StoredUpload = {
  url: string;
  path: string;
  filename: string;
  mimeType: string;
  size: number;
};

const DEFAULT_STORAGE_BUCKET = "dcreator-uploads";

const MIME_EXTENSION_MAP: Record<string, string> = {
  "application/pdf": "pdf",
  "application/msword": "doc",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/svg+xml": "svg",
  "text/plain": "txt"
};

function sanitizeExt(ext: string) {
  return ext.trim().toLowerCase().replace(/^\./, "");
}

function extensionFromFileName(name: string) {
  const parsed = path.parse(name);
  const rawExt = parsed.ext.replace(/^\./, "").trim().toLowerCase();
  return rawExt || null;
}

function safeSegment(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80)
    .toLowerCase();
}

function safeOriginalName(name: string, fallback: string, extension: string) {
  const parsed = path.parse(name);
  const baseName = safeSegment(parsed.name || fallback) || fallback;
  return `${baseName}.${extension}`;
}

function resolveFileExtension(file: File, ext?: string) {
  const safeExt = ext ? sanitizeExt(ext) : "";
  if (safeExt) {
    if (safeExt === "jpeg") return "jpg";
    if (safeExt === "plain") return "txt";
    if (safeExt === "svg+xml") return "svg";
    if (safeExt === "vnd.openxmlformats-officedocument.wordprocessingml.document") return "docx";
    return safeExt;
  }

  const mappedByMime = MIME_EXTENSION_MAP[file.type];
  if (mappedByMime) return mappedByMime;

  const fromName = extensionFromFileName(file.name);
  if (fromName) {
    if (fromName === "jpeg") return "jpg";
    return fromName;
  }

  const fromMime = sanitizeExt(file.type.split("/")[1] || "");
  return fromMime || "bin";
}

function makeFileName(file: File, suffix: string, ext?: string) {
  const extension = resolveFileExtension(file, ext);
  const safeSuffix = safeSegment(suffix) || "upload";
  const originalName = safeOriginalName(file.name, safeSuffix, extension);
  return `${Date.now()}-${randomUUID()}-${safeSuffix}-${originalName}`;
}

function makeTextFileName(suffix: string, ext = "txt") {
  const safeSuffix = safeSegment(suffix) || "text-upload";
  const extension = sanitizeExt(ext || "txt") || "txt";
  return `${Date.now()}-${randomUUID()}-${safeSuffix}.${extension}`;
}

function makeObjectPath(folder: UploadFolder, ownerId: string | undefined, fileName: string) {
  const safeOwnerId = ownerId ? safeSegment(ownerId) : "";
  return [folder, safeOwnerId, fileName].filter(Boolean).join("/");
}

function getStorageConfig() {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const bucket = process.env.SUPABASE_STORAGE_BUCKET || DEFAULT_STORAGE_BUCKET;
  return {
    supabaseUrl: supabaseUrl?.replace(/\/$/, "") ?? "",
    serviceRoleKey,
    bucket
  };
}

async function saveToLocalPublic(input: UploadInput): Promise<StoredUpload> {
  const { file, folder, suffix, ext, ownerId } = input;
  const buffer = Buffer.from(await file.arrayBuffer());
  const fileName = makeFileName(file, suffix, ext);
  const objectPath = makeObjectPath(folder, ownerId, fileName);
  const relativeDir = path.join("uploads", path.dirname(objectPath));
  const absoluteDir = path.join(process.cwd(), "public", relativeDir);
  await mkdir(absoluteDir, { recursive: true });
  await writeFile(path.join(absoluteDir, fileName), buffer);
  const localPath = `/uploads/${objectPath.replace(/\\/g, "/")}`;
  return {
    url: localPath,
    path: localPath,
    filename: fileName,
    mimeType: file.type || "application/octet-stream",
    size: file.size
  };
}

async function saveToSupabaseStorage(input: UploadInput): Promise<StoredUpload> {
  const { file, folder, suffix, ext, ownerId } = input;
  const { supabaseUrl, serviceRoleKey, bucket } = getStorageConfig();

  if (!supabaseUrl || !serviceRoleKey) {
    throw new AppError(
      "Missing NEXT_PUBLIC_SUPABASE_URL/SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY for storage upload",
      500,
      "UPLOAD_STORAGE_CONFIG_MISSING"
    );
  }

  const fileName = makeFileName(file, suffix, ext);
  const objectPath = makeObjectPath(folder, ownerId, fileName);
  const uploadUrl = `${supabaseUrl}/storage/v1/object/${bucket}/${objectPath}`;
  const body = Buffer.from(await file.arrayBuffer());

  const response = await fetch(uploadUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${serviceRoleKey}`,
      apikey: serviceRoleKey,
      "x-upsert": "false",
      "content-type": file.type || "application/octet-stream"
    },
    body
  });

  if (!response.ok) {
    const details = await response.text();
    throw new AppError("Failed to upload file to storage", 502, "UPLOAD_STORAGE_FAILED", details);
  }

  return {
    url: `${supabaseUrl}/storage/v1/object/public/${bucket}/${objectPath}`,
    path: objectPath,
    filename: fileName,
    mimeType: file.type || "application/octet-stream",
    size: file.size
  };
}

async function saveTextToLocalPublic(input: TextUploadInput): Promise<StoredUpload> {
  const { content, folder, suffix, ext, ownerId } = input;
  const fileName = makeTextFileName(suffix, ext ?? "txt");
  const objectPath = makeObjectPath(folder, ownerId, fileName);
  const relativeDir = path.join("uploads", path.dirname(objectPath));
  const absoluteDir = path.join(process.cwd(), "public", relativeDir);
  await mkdir(absoluteDir, { recursive: true });
  await writeFile(path.join(absoluteDir, fileName), content, "utf8");
  const localPath = `/uploads/${objectPath.replace(/\\/g, "/")}`;
  return {
    url: localPath,
    path: localPath,
    filename: fileName,
    mimeType: "text/plain",
    size: Buffer.byteLength(content, "utf8")
  };
}

async function saveTextToSupabaseStorage(input: TextUploadInput): Promise<StoredUpload> {
  const { content, folder, suffix, ext, ownerId } = input;
  const { supabaseUrl, serviceRoleKey, bucket } = getStorageConfig();

  if (!supabaseUrl || !serviceRoleKey) {
    throw new AppError(
      "Missing NEXT_PUBLIC_SUPABASE_URL/SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY for storage upload",
      500,
      "UPLOAD_STORAGE_CONFIG_MISSING"
    );
  }

  const fileName = makeTextFileName(suffix, ext ?? "txt");
  const objectPath = makeObjectPath(folder, ownerId, fileName);
  const uploadUrl = `${supabaseUrl}/storage/v1/object/${bucket}/${objectPath}`;
  const body = Buffer.from(content, "utf8");

  const response = await fetch(uploadUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${serviceRoleKey}`,
      apikey: serviceRoleKey,
      "x-upsert": "false",
      "content-type": "text/plain; charset=utf-8"
    },
    body
  });

  if (!response.ok) {
    const details = await response.text();
    throw new AppError("Failed to upload text file to storage", 502, "UPLOAD_STORAGE_FAILED", details);
  }

  return {
    url: `${supabaseUrl}/storage/v1/object/public/${bucket}/${objectPath}`,
    path: objectPath,
    filename: fileName,
    mimeType: "text/plain",
    size: body.byteLength
  };
}

function shouldUseSupabaseStorage() {
  const { supabaseUrl, serviceRoleKey } = getStorageConfig();
  return Boolean(supabaseUrl && serviceRoleKey) || process.env.NODE_ENV === "production";
}

export async function saveUploadAsset(input: UploadInput) {
  if (shouldUseSupabaseStorage()) {
    return saveToSupabaseStorage(input);
  }
  return saveToLocalPublic(input);
}

export async function saveTextUploadAsset(input: TextUploadInput) {
  if (shouldUseSupabaseStorage()) {
    return saveTextToSupabaseStorage(input);
  }
  return saveTextToLocalPublic(input);
}

export async function saveUpload(input: UploadInput) {
  const upload = await saveUploadAsset(input);
  return upload.url;
}

export async function saveTextUpload(input: TextUploadInput) {
  const upload = await saveTextUploadAsset(input);
  return upload.url;
}

export function getDefaultStorageBucket() {
  return process.env.SUPABASE_STORAGE_BUCKET || DEFAULT_STORAGE_BUCKET;
}
