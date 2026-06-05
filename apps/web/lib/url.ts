const URL_IN_TEXT_PATTERN = /(?:https?:\/\/|www\.)[^\s<>"')]+|(?:[a-z0-9-]+\.)+[a-z]{2,}(?:\/[^\s<>"')]*)?/gi;

function trimTrailingPunctuation(value: string) {
  return value.replace(/[.,;:!?]+$/, "");
}

export function normalizeUrl(value: string) {
  const trimmed = trimTrailingPunctuation(value.trim());
  if (!trimmed) return "";
  const hasProtocol = /^https?:\/\//i.test(trimmed);
  if (!hasProtocol && !/^(www\.|localhost(?::\d+)?(?:\/|$)|[a-z0-9-]+(?:\.[a-z0-9-]+)+(?:[/:?#]|$))/i.test(trimmed)) {
    return "";
  }
  const candidate = hasProtocol ? trimmed : `https://${trimmed}`;
  try {
    const url = new URL(candidate);
    if (url.protocol !== "http:" && url.protocol !== "https:") return "";
    return url.toString();
  } catch {
    return "";
  }
}

export function isValidUrl(value: string) {
  return Boolean(normalizeUrl(value));
}

export function getHostnameLabel(url: string) {
  const normalized = normalizeUrl(url);
  if (!normalized) return "";
  try {
    return new URL(normalized).hostname.replace(/^www\./i, "");
  } catch {
    return "";
  }
}

export function extractUrlsFromText(text: string) {
  const matches = text.match(URL_IN_TEXT_PATTERN) ?? [];
  const urls = matches.map((item) => normalizeUrl(item)).filter(Boolean);
  return Array.from(new Set(urls));
}

export function shortenUrl(url: string, maxLength = 56) {
  const normalized = normalizeUrl(url) || url.trim();
  if (normalized.length <= maxLength) return normalized;
  const headLength = Math.max(16, Math.floor((maxLength - 3) * 0.62));
  const tailLength = Math.max(8, maxLength - headLength - 3);
  return `${normalized.slice(0, headLength)}...${normalized.slice(-tailLength)}`;
}
