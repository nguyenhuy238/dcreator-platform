export const CREATOR_PLATFORMS = ["tiktok", "facebook", "instagram", "shopee"] as const;
export const BRAND_LINK_PLATFORMS = ["website", "tiktok", "tiktok_shop", "shopee", "facebook", "instagram", "youtube", "lazada", "other"] as const;

export type CreatorPlatform = (typeof CREATOR_PLATFORMS)[number];
export type BrandLinkPlatform = (typeof BRAND_LINK_PLATFORMS)[number];

export type CreatorLink = {
  platform: CreatorPlatform;
  url: string;
  handle: string;
  followerCount: number;
};

export type BrandLink = {
  platform: BrandLinkPlatform;
  url: string;
};

export function normalizeCreatorUrl(input: string) {
  const trimmed = input.trim();
  if (!trimmed) return "";
  const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  try {
    const parsed = new URL(withProtocol);
    if (!parsed.hostname) return null;
    return parsed.toString();
  } catch {
    return null;
  }
}

export function normalizeCreatorLinks(links: CreatorLink[]) {
  const populatedLinks = links.filter((item) => item.url.trim());
  if (populatedLinks.length === 0) {
    throw new Error("Vui lòng thêm ít nhất 1 liên kết TikTok, Facebook, Instagram hoặc Shopee.");
  }

  return populatedLinks.map((item) => {
    const url = normalizeCreatorUrl(item.url);
    if (!url) {
      throw new Error("Liên kết không hợp lệ. Vui lòng nhập URL TikTok, Facebook, Instagram hoặc Shopee hợp lệ.");
    }
    const handle = item.handle.trim().replace(/^@+/, "");
    if (!handle) {
      throw new Error("Vui lòng nhập tên tài khoản hoặc ID kênh cho từng liên kết.");
    }
    if (!Number.isFinite(item.followerCount) || item.followerCount < 0) {
      throw new Error("Số lượng follower không hợp lệ.");
    }
    return { platform: item.platform, url, handle, followerCount: Math.trunc(item.followerCount) };
  });
}

export function normalizeBrandLinks(links: BrandLink[]) {
  const populatedLinks = links.filter((item) => item.url.trim());
  const seenPlatforms = new Set<BrandLinkPlatform>();
  return populatedLinks.map((item) => {
    if (!BRAND_LINK_PLATFORMS.includes(item.platform)) {
      throw new Error("Nền tảng website/kênh bán hàng không hợp lệ.");
    }
    if (item.platform !== "other" && seenPlatforms.has(item.platform)) {
      throw new Error("Không được chọn trùng cùng một nền tảng, trừ mục Khác.");
    }
    seenPlatforms.add(item.platform);
    const url = normalizeCreatorUrl(item.url);
    if (!url) {
      throw new Error("Liên kết website/kênh bán hàng không hợp lệ. Vui lòng nhập URL hợp lệ.");
    }
    return { platform: item.platform, url };
  });
}

export function resolveSelectedIndustries(selectedIndustries: string[], otherIndustry: string) {
  const industries = selectedIndustries
    .map((industry) => (industry === "Khác" ? otherIndustry.trim() : industry))
    .filter(Boolean);
  if (industries.length === 0) {
    throw new Error("Vui lòng chọn ít nhất 1 ngành hàng.");
  }
  return industries;
}
