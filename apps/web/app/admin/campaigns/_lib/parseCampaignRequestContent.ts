export type CampaignRequestLink = {
  key: string;
  type: "image" | "file" | "link";
  label: string;
  url: string;
};

export type ParsedCampaignRequestContent = {
  cleanContent: string;
  links: CampaignRequestLink[];
  coverImageUrl?: string;
  contentFileUrl?: string;
  contractFileUrl?: string;
};

const MARKER_PATTERN = /^\s*(?:\[\[([A-Z0-9_ -]+)\]\]|([A-Z0-9_ -]+))\s*:\s*(.+?)\s*$/i;
const URL_PATTERN = /https?:\/\/[^\s<>"')]+/gi;

function toSafeUrl(value: string) {
  try {
    const url = new URL(value.trim());
    if (url.protocol === "http:" || url.protocol === "https:") return url.toString();
  } catch {
    return null;
  }
  return null;
}

function normalizeKey(value: string) {
  return value.trim().toUpperCase().replace(/[\s-]+/g, "_");
}

function inferType(key: string, url: string): CampaignRequestLink["type"] {
  const lowerUrl = url.toLowerCase();
  if (key.includes("IMAGE") || key.includes("LOGO") || /\.(png|jpe?g|webp|gif|svg)(?:\?|#|$)/.test(lowerUrl)) return "image";
  if (key.includes("FILE") || key.includes("CONTRACT") || key.includes("DOC") || /\.(pdf|docx?|xlsx?|pptx?)(?:\?|#|$)/.test(lowerUrl)) return "file";
  return "link";
}

function getLabel(key: string, type: CampaignRequestLink["type"]) {
  if (key.includes("COVER")) return "Mở ảnh cover";
  if (key.includes("LOGO")) return "Mở logo Brand";
  if (key.includes("CONTENT")) return "Mở file nội dung campaign";
  if (key.includes("CONTRACT")) return "Mở file hợp đồng";
  if (type === "image") return "Mở ảnh";
  if (type === "file") return "Mở file";
  return "Mở link";
}

function addLink(links: CampaignRequestLink[], key: string, rawUrl: string) {
  const url = toSafeUrl(rawUrl);
  if (!url || links.some((item) => item.url === url)) return null;
  const normalizedKey = normalizeKey(key);
  const type = inferType(normalizedKey, url);
  const link = { key: normalizedKey, type, label: getLabel(normalizedKey, type), url };
  links.push(link);
  return link;
}

export function parseCampaignRequestContent(rawContent?: string | null): ParsedCampaignRequestContent {
  const content = rawContent ?? "";
  const links: CampaignRequestLink[] = [];
  const cleanLines: string[] = [];
  let coverImageUrl: string | undefined;
  let contentFileUrl: string | undefined;
  let contractFileUrl: string | undefined;

  for (const line of content.split(/\r?\n/)) {
    const markerMatch = line.match(MARKER_PATTERN);
    if (markerMatch) {
      const key = normalizeKey(markerMatch[1] ?? markerMatch[2] ?? "");
      const markerValue = markerMatch[3];
      const link = markerValue ? addLink(links, key, markerValue) : null;
      if (link?.type === "image" && key.includes("COVER")) coverImageUrl = link.url;
      if (link && key.includes("CONTENT")) contentFileUrl = link.url;
      if (link && key.includes("CONTRACT")) contractFileUrl = link.url;
      if (link) continue;
    }

    cleanLines.push(line);
    const urls = line.match(URL_PATTERN) ?? [];
    urls.forEach((url) => addLink(links, "URL", url));
  }

  return {
    cleanContent: cleanLines.join("\n").trim(),
    links,
    coverImageUrl,
    contentFileUrl,
    contractFileUrl
  };
}
