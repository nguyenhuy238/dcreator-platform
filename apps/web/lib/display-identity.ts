import { resolveImageUrl } from "@/lib/images/resolve-image-url";

export const DEFAULT_USER_AVATAR = "/images/default-user.svg";
export const DEFAULT_CREATOR_AVATAR = "/images/default-creator.svg";
export const DEFAULT_BRAND_LOGO = "/images/default-brand.svg";

type AccountLike = {
  displayName?: string | null;
  avatarUrl?: string | null;
  email?: string | null;
};

export function cleanDisplayText(value?: string | null) {
  return value?.trim() ?? "";
}

export function cleanDisplayUrl(value?: string | null) {
  return value?.replace(/[\r\n\s]/g, "").trim() ?? "";
}

function resolveDisplayImageUrl(value: string | null | undefined, fallback: string) {
  return resolveImageUrl(cleanDisplayUrl(value), fallback);
}

export function getUserDisplay(user: AccountLike) {
  return {
    name: cleanDisplayText(user.displayName) || cleanDisplayText(user.email) || "Người dùng",
    avatar: resolveDisplayImageUrl(user.avatarUrl, DEFAULT_USER_AVATAR)
  };
}

export function getCreatorDisplay(creator: {
  displayName?: string | null;
  avatarUrl?: string | null;
  account?: AccountLike | null;
}) {
  return {
    name: cleanDisplayText(creator.displayName) || cleanDisplayText(creator.account?.displayName) || "Creator dCreator",
    avatar: resolveDisplayImageUrl(creator.avatarUrl || creator.account?.avatarUrl, DEFAULT_CREATOR_AVATAR)
  };
}

export function getBrandDisplay(brand: {
  name?: string | null;
  displayName?: string | null;
  legalName?: string | null;
  logoUrl?: string | null;
  avatarUrl?: string | null;
  owner?: AccountLike | null;
}) {
  return {
    name: cleanDisplayText(brand.name) || cleanDisplayText(brand.legalName) || cleanDisplayText(brand.displayName) || "Brand dCreator",
    logo: resolveDisplayImageUrl(brand.logoUrl || brand.avatarUrl || brand.owner?.avatarUrl, DEFAULT_BRAND_LOGO)
  };
}

type CampaignBrandLike = {
  name?: string | null;
  legalName?: string | null;
  logoUrl?: string | null;
};

export function getBrandDisplayName(campaign: {
  brand?: CampaignBrandLike | null;
  brandName?: string | null;
}) {
  return (
    cleanDisplayText(campaign.brand?.name) ||
    cleanDisplayText(campaign.brandName) ||
    cleanDisplayText(campaign.brand?.legalName) ||
    "Brand chưa cập nhật"
  );
}

export function getCampaignBrandDisplay(campaign: {
  brand?: CampaignBrandLike | null;
  brandName?: string | null;
}) {
  return {
    name: getBrandDisplayName(campaign),
    logo: resolveDisplayImageUrl(campaign.brand?.logoUrl, DEFAULT_BRAND_LOGO)
  };
}
