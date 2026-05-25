import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth/guard";
import { AppError, toErrorResponse } from "@/lib/errors";

export const runtime = "nodejs";

const DOCX_MIME = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
const MIME_BY_EXT: Record<string, string> = {
  pdf: "application/pdf",
  doc: "application/msword",
  docx: DOCX_MIME,
  txt: "text/plain; charset=utf-8",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg"
};

function sanitizeFileName(name: string) {
  const cleaned = name.replace(/[^a-zA-Z0-9._-]/g, "_");
  return cleaned.length > 0 ? cleaned : "campaign-content.bin";
}

function inferFileMeta(fileName: string) {
  const parsed = path.parse(fileName);
  const ext = parsed.ext.replace(/^\./, "").toLowerCase();

  if (ext === "vnd.openxmlformats-officedocument.wordprocessingml.document") {
    return { fileName: `${parsed.name}.docx`, contentType: DOCX_MIME };
  }

  return {
    fileName,
    contentType: MIME_BY_EXT[ext] ?? "application/octet-stream"
  };
}

function buildAttachmentHeaders(fileName: string, contentType: string) {
  return {
    "Content-Type": contentType,
    "Content-Disposition": `attachment; filename="${sanitizeFileName(fileName)}"`,
    "Cache-Control": "no-store"
  };
}

function getLocalOnboardingDocFilePath(relativeUrl: string) {
  if (!relativeUrl.startsWith("/uploads/onboarding-doc/")) {
    throw new AppError("Invalid campaign content file path", 400, "INVALID_CAMPAIGN_CONTENT_FILE_PATH");
  }

  const publicRoot = path.resolve(process.cwd(), "public");
  const resolved = path.resolve(publicRoot, `.${relativeUrl}`);

  if (!resolved.startsWith(path.resolve(publicRoot, "uploads", "onboarding-doc"))) {
    throw new AppError("Invalid campaign content file path", 400, "INVALID_CAMPAIGN_CONTENT_FILE_PATH");
  }

  return resolved;
}

function isAllowedSupabaseOnboardingDocUrl(url: URL) {
  if (!url.pathname.includes("/onboarding-doc/")) return false;
  const supabaseUrl = process.env.SUPABASE_URL;
  if (!supabaseUrl) return false;

  try {
    const supabaseHost = new URL(supabaseUrl).host;
    return url.host === supabaseHost;
  } catch {
    return false;
  }
}

export async function GET(request: NextRequest) {
  try {
    await requireAuth(request);

    const urlParam = request.nextUrl.searchParams.get("url")?.trim();
    if (!urlParam) throw new AppError("Missing campaign content url", 422, "CAMPAIGN_CONTENT_URL_REQUIRED");

    if (urlParam.startsWith("/")) {
      const absolutePath = getLocalOnboardingDocFilePath(urlParam);
      const fileBuffer = await readFile(absolutePath);
      const meta = inferFileMeta(path.basename(absolutePath) || "campaign-content.bin");

      return new Response(fileBuffer, {
        status: 200,
        headers: buildAttachmentHeaders(meta.fileName, meta.contentType)
      });
    }

    let remoteUrl: URL;
    try {
      remoteUrl = new URL(urlParam);
    } catch {
      throw new AppError("Invalid campaign content url", 400, "INVALID_CAMPAIGN_CONTENT_URL");
    }

    if (!isAllowedSupabaseOnboardingDocUrl(remoteUrl)) {
      throw new AppError("Forbidden campaign content url", 403, "CAMPAIGN_CONTENT_URL_FORBIDDEN");
    }

    const upstream = await fetch(remoteUrl.toString(), { cache: "no-store" });
    if (!upstream.ok) throw new AppError("Unable to fetch campaign content file", 502, "CAMPAIGN_CONTENT_DOWNLOAD_FAILED");

    const sourceFileName = path.basename(remoteUrl.pathname) || "campaign-content.bin";
    const meta = inferFileMeta(sourceFileName);
    const body = await upstream.arrayBuffer();

    return new Response(body, {
      status: 200,
      headers: buildAttachmentHeaders(meta.fileName, meta.contentType)
    });
  } catch (error) {
    return toErrorResponse(error);
  }
}

