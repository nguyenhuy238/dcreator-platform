export const CAMPAIGN_IMAGE_FALLBACK = "/images/campaign-fallback.svg";

const PUBLIC_STORAGE_PREFIX = "/storage/v1/object/public/";
const UPLOADS_PREFIX = "/uploads/";
const DEFAULT_STORAGE_BUCKET = "dcreator-uploads";

function warnInvalidImageUrl(input: string | null | undefined, reason: string) {
  if (process.env.NODE_ENV !== "production") {
    console.warn(`[resolveImageUrl] ${reason}`, input);
  }
}

function getSupabaseUrl() {
  return process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/+$/, "") ?? "";
}

export function normalizeImageUrlInput(input?: string | null): string {
  return input?.replace(/[\r\n\s]/g, "").trim() ?? "";
}

export function resolveImageUrl(
  input?: string | null,
  fallback = CAMPAIGN_IMAGE_FALLBACK
): string {
  const value = normalizeImageUrlInput(input);
  if (!value) return fallback;
  const supabaseUrl = getSupabaseUrl();

  if (/^https?:\/\//i.test(value)) {
    try {
      const url = new URL(value);
      if (!url.pathname || url.pathname === "/") {
        warnInvalidImageUrl(input, "URL chỉ có domain, không có object path");
        return fallback;
      }
      if (supabaseUrl && url.hostname.endsWith(".supabase.co")) {
        const configuredSupabaseUrl = new URL(supabaseUrl);
        if (url.hostname !== configuredSupabaseUrl.hostname) {
          warnInvalidImageUrl(input, "Hostname Supabase không khớp env, dùng hostname đã cấu hình");
          return `${supabaseUrl}${url.pathname}${url.search}${url.hash}`;
        }
      }
      return value;
    } catch {
      warnInvalidImageUrl(input, "URL http(s) không hợp lệ");
      return fallback;
    }
  }

  if (value.startsWith(PUBLIC_STORAGE_PREFIX)) {
    if (supabaseUrl) return `${supabaseUrl}${value}`;
    warnInvalidImageUrl(input, "Thiếu NEXT_PUBLIC_SUPABASE_URL để resolve storage path");
    return fallback;
  }

  if (value.startsWith(UPLOADS_PREFIX)) {
    // Legacy uploads are tracked static assets. New production uploads already store full URLs.
    return value;
  }

  if (value.startsWith("/images/")) return value;

  if (!value.startsWith("/") && supabaseUrl) {
    return `${supabaseUrl}${PUBLIC_STORAGE_PREFIX}${DEFAULT_STORAGE_BUCKET}/${value}`;
  }

  warnInvalidImageUrl(input, "Định dạng URL ảnh không được hỗ trợ");
  return fallback;
}
