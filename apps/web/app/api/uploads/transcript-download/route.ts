import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth/guard";
import { AppError, toErrorResponse } from "@/lib/errors";

export const runtime = "nodejs";

function sanitizeFileName(name: string) {
  const cleaned = name.replace(/[^a-zA-Z0-9._-]/g, "_");
  return cleaned.length > 0 ? cleaned : "transcript.txt";
}

function buildAttachmentHeaders(fileName: string, contentType: string) {
  return {
    "Content-Type": contentType,
    "Content-Disposition": `attachment; filename=\"${sanitizeFileName(fileName)}\"`,
    "Cache-Control": "no-store"
  };
}

function getLocalTranscriptFilePath(relativeUrl: string) {
  if (!relativeUrl.startsWith("/uploads/creator-transcript/")) {
    throw new AppError("Invalid transcript file path", 400, "INVALID_TRANSCRIPT_FILE_PATH");
  }

  const publicRoot = path.resolve(process.cwd(), "public");
  const resolved = path.resolve(publicRoot, `.${relativeUrl}`);

  if (!resolved.startsWith(path.resolve(publicRoot, "uploads", "creator-transcript"))) {
    throw new AppError("Invalid transcript file path", 400, "INVALID_TRANSCRIPT_FILE_PATH");
  }

  return resolved;
}

function isAllowedSupabaseTranscriptUrl(url: URL) {
  if (!url.pathname.includes("/creator-transcript/")) return false;
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
    if (!urlParam) {
      throw new AppError("Missing transcript url", 422, "TRANSCRIPT_URL_REQUIRED");
    }

    if (urlParam.startsWith("/")) {
      const absolutePath = getLocalTranscriptFilePath(urlParam);
      const fileBuffer = await readFile(absolutePath);
      const fileName = path.basename(absolutePath) || "transcript.txt";

      return new Response(fileBuffer, {
        status: 200,
        headers: buildAttachmentHeaders(fileName, "text/plain; charset=utf-8")
      });
    }

    let remoteUrl: URL;
    try {
      remoteUrl = new URL(urlParam);
    } catch {
      throw new AppError("Invalid transcript url", 400, "INVALID_TRANSCRIPT_URL");
    }

    if (!isAllowedSupabaseTranscriptUrl(remoteUrl)) {
      throw new AppError("Forbidden transcript url", 403, "TRANSCRIPT_URL_FORBIDDEN");
    }

    const upstream = await fetch(remoteUrl.toString(), { cache: "no-store" });
    if (!upstream.ok) {
      throw new AppError("Unable to fetch transcript file", 502, "TRANSCRIPT_DOWNLOAD_FAILED");
    }

    const contentType = upstream.headers.get("content-type") || "text/plain; charset=utf-8";
    const fileName = path.basename(remoteUrl.pathname) || "transcript.txt";
    const body = await upstream.arrayBuffer();

    return new Response(body, {
      status: 200,
      headers: buildAttachmentHeaders(fileName, contentType)
    });
  } catch (error) {
    return toErrorResponse(error);
  }
}
