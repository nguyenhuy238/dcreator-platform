import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth/guard";
import { AppError, toErrorResponse } from "@/lib/errors";

export const runtime = "nodejs";

const MIME_BY_EXT: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  webp: "image/webp"
};

function sanitizeFileName(name: string) {
  const cleaned = name.replace(/[^a-zA-Z0-9._-]/g, "_");
  return cleaned.length > 0 ? cleaned : "mission-proof.jpg";
}

function buildAttachmentHeaders(fileName: string, contentType: string) {
  return {
    "Content-Type": contentType,
    "Content-Disposition": `attachment; filename="${sanitizeFileName(fileName)}"`,
    "Cache-Control": "no-store"
  };
}

function getLocalMissionProofFilePath(relativeUrl: string) {
  if (!relativeUrl.startsWith("/uploads/creator-mission-proof/")) {
    throw new AppError("Invalid mission proof file path", 400, "INVALID_MISSION_PROOF_FILE_PATH");
  }

  const publicRoot = path.resolve(process.cwd(), "public");
  const resolved = path.resolve(publicRoot, `.${relativeUrl}`);
  const allowedRoot = path.resolve(publicRoot, "uploads", "creator-mission-proof");

  if (!resolved.startsWith(allowedRoot)) {
    throw new AppError("Invalid mission proof file path", 400, "INVALID_MISSION_PROOF_FILE_PATH");
  }

  return resolved;
}

function inferContentType(fileName: string) {
  const ext = path.extname(fileName).replace(/^\./, "").toLowerCase();
  return MIME_BY_EXT[ext] ?? "application/octet-stream";
}

function isAllowedSupabaseMissionProofUrl(url: URL) {
  if (!url.pathname.includes("/creator-mission-proof/")) return false;
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
    if (!urlParam) throw new AppError("Missing mission proof url", 422, "MISSION_PROOF_URL_REQUIRED");

    if (urlParam.startsWith("/")) {
      const absolutePath = getLocalMissionProofFilePath(urlParam);
      const fileBuffer = await readFile(absolutePath);
      const fileName = path.basename(absolutePath) || "mission-proof.jpg";

      return new Response(fileBuffer, {
        status: 200,
        headers: buildAttachmentHeaders(fileName, inferContentType(fileName))
      });
    }

    let remoteUrl: URL;
    try {
      remoteUrl = new URL(urlParam);
    } catch {
      throw new AppError("Invalid mission proof url", 400, "INVALID_MISSION_PROOF_URL");
    }

    if (!isAllowedSupabaseMissionProofUrl(remoteUrl)) {
      throw new AppError("Forbidden mission proof url", 403, "MISSION_PROOF_URL_FORBIDDEN");
    }

    const upstream = await fetch(remoteUrl.toString(), { cache: "no-store" });
    if (!upstream.ok) {
      throw new AppError("Unable to fetch mission proof file", 502, "MISSION_PROOF_DOWNLOAD_FAILED");
    }

    const fileName = path.basename(remoteUrl.pathname) || "mission-proof.jpg";
    const contentType = upstream.headers.get("content-type") || inferContentType(fileName);
    const body = await upstream.arrayBuffer();

    return new Response(body, {
      status: 200,
      headers: buildAttachmentHeaders(fileName, contentType)
    });
  } catch (error) {
    return toErrorResponse(error);
  }
}
