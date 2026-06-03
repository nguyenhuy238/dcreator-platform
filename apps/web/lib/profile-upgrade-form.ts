export const CREATOR_PLATFORMS = ["tiktok", "facebook", "instagram", "shopee"] as const;

export type CreatorPlatform = (typeof CREATOR_PLATFORMS)[number];

export type CreatorLink = {
  platform: CreatorPlatform;
  url: string;
  handle: string;
  followerCount: number;
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

export function resolveSelectedIndustries(selectedIndustries: string[], otherIndustry: string) {
  const industries = selectedIndustries
    .map((industry) => (industry === "Khác" ? otherIndustry.trim() : industry))
    .filter(Boolean);
  if (industries.length === 0) {
    throw new Error("Vui lòng chọn ít nhất 1 ngành hàng.");
  }
  return industries;
}
