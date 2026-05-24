import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { AppError } from "@/lib/errors";

type UploadFolder = "creator-kyc" | "brand-kyc" | "onboarding-doc" | "brand-logo" | "avatar";

type UploadInput = {
  file: File;
  folder: UploadFolder;
  suffix: string;
  ext?: string;
};

function resolveFileExtension(file: File, ext?: string) {
  if (ext) return ext;
  const fromMime = file.type.split("/")[1];
  return fromMime || "bin";
}

function makeFileName(file: File, suffix: string, ext?: string) {
  const extension = resolveFileExtension(file, ext);
  return `${Date.now()}-${randomUUID()}-${suffix}.${extension}`;
}

async function saveToLocalPublic(input: UploadInput) {
  const { file, folder, suffix, ext } = input;
  const buffer = Buffer.from(await file.arrayBuffer());
  const fileName = makeFileName(file, suffix, ext);
  const relativeDir = path.join("uploads", folder);
  const absoluteDir = path.join(process.cwd(), "public", relativeDir);
  await mkdir(absoluteDir, { recursive: true });
  await writeFile(path.join(absoluteDir, fileName), buffer);
  return `/${relativeDir.replace(/\\/g, "/")}/${fileName}`;
}

async function saveToSupabaseStorage(input: UploadInput) {
  const { file, folder, suffix, ext } = input;
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const bucket = process.env.SUPABASE_STORAGE_BUCKET;

  if (!supabaseUrl || !serviceRoleKey || !bucket) {
    throw new AppError(
      "Missing SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, or SUPABASE_STORAGE_BUCKET for production upload",
      500,
      "UPLOAD_STORAGE_CONFIG_MISSING"
    );
  }

  const fileName = makeFileName(file, suffix, ext);
  const objectPath = `${folder}/${fileName}`;
  const uploadUrl = `${supabaseUrl.replace(/\/$/, "")}/storage/v1/object/${bucket}/${objectPath}`;
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

  return `${supabaseUrl.replace(/\/$/, "")}/storage/v1/object/public/${bucket}/${objectPath}`;
}

export async function saveUpload(input: UploadInput) {
  const isProduction = process.env.NODE_ENV === "production";
  if (isProduction) return saveToSupabaseStorage(input);
  return saveToLocalPublic(input);
}
