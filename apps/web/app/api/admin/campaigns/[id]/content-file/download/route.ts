import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextRequest } from "next/server";
import { requireAdminOps } from "@/lib/auth/admin-guard";
import { campaignRequestMarkers, extractCampaignRequestMarkerValue } from "@/lib/campaign-request-meta";
import { prisma } from "@/lib/db";
import { AppError, toErrorResponse } from "@/lib/errors";

export const runtime = "nodejs";

type Props = { params: Promise<{ id: string }> };

const CONTENT_FILE_MARKER = campaignRequestMarkers.content;
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
const ALLOWED_STORAGE_FOLDERS = new Set(["onboarding-doc", "campaign-file", "campaign-content", "campaign-briefs", "campaign-files"]);
const FALLBACK_ALLOWED_BUCKETS = new Set(["dcreator-uploads", "onboarding-docs", "campaign-content", "campaign-briefs", "campaign-files"]);

function extractContentFileUrl(brief: string) {
  return extractCampaignRequestMarkerValue(brief, CONTENT_FILE_MARKER);
}

function sanitizeFileName(name: string) {
  const cleaned = name.replace(/[^a-zA-Z0-9._-]/g, "_");
  return cleaned.length > 0 ? cleaned : "campaign-content.bin";
}

function inferFileMeta(fileName: string, contentType?: string | null) {
  const parsed = path.parse(fileName);
  const ext = parsed.ext.replace(/^\./, "").toLowerCase();
  return {
    fileName,
    contentType: contentType || MIME_BY_EXT[ext] || "application/octet-stream"
  };
}

function buildAttachmentHeaders(fileName: string, contentType: string) {
  return {
    "Content-Type": contentType,
    "Content-Disposition": `attachment; filename="${sanitizeFileName(fileName)}"`,
    "Cache-Control": "no-store"
  };
}

function getSupabaseBaseUrl() {
  return (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "").replace(/\/+$/, "");
}

function getAllowedBuckets() {
  const configuredBucket = process.env.SUPABASE_STORAGE_BUCKET?.trim();
  return configuredBucket ? new Set([configuredBucket]) : FALLBACK_ALLOWED_BUCKETS;
}

function getLocalCampaignFilePath(relativeUrl: string) {
  if (!relativeUrl.startsWith("/uploads/")) {
    throw new AppError("File campaign không hợp lệ", 400, "INVALID_CAMPAIGN_CONTENT_FILE_PATH");
  }

  const publicRoot = path.resolve(process.cwd(), "public");
  const resolved = path.resolve(publicRoot, `.${relativeUrl}`);
  const allowedRoots = Array.from(ALLOWED_STORAGE_FOLDERS).map((folder) => path.resolve(publicRoot, "uploads", folder));

  if (!allowedRoots.some((root) => resolved.startsWith(root))) {
    throw new AppError("File campaign không hợp lệ", 400, "INVALID_CAMPAIGN_CONTENT_FILE_PATH");
  }

  return resolved;
}

function parseSupabaseStorageUrl(fileUrl: string) {
  const supabaseBaseUrl = getSupabaseBaseUrl();
  if (!supabaseBaseUrl) {
    throw new AppError("File campaign không hợp lệ", 400, "CAMPAIGN_CONTENT_STORAGE_CONFIG_MISSING");
  }

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(fileUrl);
  } catch {
    throw new AppError("File campaign không hợp lệ", 400, "INVALID_CAMPAIGN_CONTENT_URL");
  }

  const supabaseHost = new URL(supabaseBaseUrl).host;
  if (parsedUrl.host !== supabaseHost) {
    throw new AppError("File campaign không hợp lệ", 403, "CAMPAIGN_CONTENT_URL_FORBIDDEN");
  }

  const segments = parsedUrl.pathname.split("/").filter(Boolean);
  const objectIndex = segments.findIndex((segment, index) => segment === "object" && segments[index - 1] === "v1");
  if (objectIndex < 0) {
    throw new AppError("File campaign không hợp lệ", 400, "INVALID_CAMPAIGN_CONTENT_URL");
  }

  const scope = segments[objectIndex + 1];
  const bucket = scope === "public" || scope === "sign" ? segments[objectIndex + 2] : scope;
  const objectPathSegments = scope === "public" || scope === "sign" ? segments.slice(objectIndex + 3) : segments.slice(objectIndex + 2);
  const objectPath = objectPathSegments.join("/");
  const rootFolder = objectPathSegments[0];

  if (!bucket || !objectPath || !rootFolder) {
    throw new AppError("File campaign không hợp lệ", 400, "INVALID_CAMPAIGN_CONTENT_URL");
  }
  if (!getAllowedBuckets().has(bucket) || !ALLOWED_STORAGE_FOLDERS.has(rootFolder)) {
    throw new AppError("File campaign không hợp lệ", 403, "CAMPAIGN_CONTENT_URL_FORBIDDEN");
  }

  return {
    bucket,
    objectPath,
    fileName: decodeURIComponent(objectPathSegments.at(-1) || "campaign-content.bin"),
    publicUrl: parsedUrl.toString()
  };
}

async function fetchSupabaseObject(fileUrl: string) {
  const storageObject = parseSupabaseStorageUrl(fileUrl);
  const supabaseBaseUrl = getSupabaseBaseUrl();
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const privateObjectUrl = `${supabaseBaseUrl}/storage/v1/object/${storageObject.bucket}/${storageObject.objectPath}`;

  const response = await fetch(privateObjectUrl, {
    cache: "no-store",
    headers: serviceRoleKey ? { Authorization: `Bearer ${serviceRoleKey}`, apikey: serviceRoleKey } : undefined
  });

  if (response.status === 404) {
    throw new AppError("Không tìm thấy file campaign", 404, "CAMPAIGN_CONTENT_FILE_NOT_FOUND");
  }
  if (!response.ok) {
    throw new AppError("Không thể tải file campaign", 502, "CAMPAIGN_CONTENT_DOWNLOAD_FAILED");
  }

  const body = await response.arrayBuffer();
  const meta = inferFileMeta(storageObject.fileName, response.headers.get("content-type"));

  return new Response(body, {
    status: 200,
    headers: buildAttachmentHeaders(meta.fileName, meta.contentType)
  });
}

export async function GET(request: NextRequest, { params }: Props) {
  try {
    await requireAdminOps(request);
    const { id: campaignId } = await params;
    const requestId = request.nextUrl.searchParams.get("requestId")?.trim();

    if (!campaignId?.trim()) {
      throw new AppError("Campaign id không hợp lệ", 422, "CAMPAIGN_ID_REQUIRED");
    }

    const campaign = await prisma.campaign.findUnique({
      where: { id: campaignId },
      select: {
        id: true,
        sourceBrandRequests: {
          where: requestId ? { id: requestId } : undefined,
          select: { id: true, brief: true },
          orderBy: { createdAt: "desc" }
        }
      }
    });

    if (!campaign) {
      throw new AppError("Không tìm thấy campaign", 404, "CAMPAIGN_NOT_FOUND");
    }

    const requestWithFile = campaign.sourceBrandRequests.find((item) => Boolean(extractContentFileUrl(item.brief)));
    if (!requestWithFile) {
      throw new AppError("Không tìm thấy file campaign", 404, "CAMPAIGN_CONTENT_FILE_NOT_FOUND");
    }

    const contentFileUrl = extractContentFileUrl(requestWithFile.brief);
    if (!contentFileUrl) {
      throw new AppError("Không tìm thấy file campaign", 404, "CAMPAIGN_CONTENT_FILE_NOT_FOUND");
    }

    if (contentFileUrl.startsWith("/")) {
      const absolutePath = getLocalCampaignFilePath(contentFileUrl);
      const fileBuffer = await readFile(absolutePath);
      const meta = inferFileMeta(path.basename(absolutePath) || "campaign-content.bin");

      return new Response(fileBuffer, {
        status: 200,
        headers: buildAttachmentHeaders(meta.fileName, meta.contentType)
      });
    }

    return await fetchSupabaseObject(contentFileUrl);
  } catch (error) {
    return toErrorResponse(error);
  }
}
