export const DEFAULT_USER_AVATAR = "/images/default-user.svg";
export const DEFAULT_CREATOR_AVATAR = "/images/default-creator.svg";
export const DEFAULT_BRAND_LOGO = "/images/default-brand.svg";

type AccountLike = {
  displayName?: string | null;
  avatarUrl?: string | null;
  email?: string | null;
};

export function getUserDisplay(user: AccountLike) {
  return {
    name: user.displayName?.trim() || user.email?.trim() || "Người dùng",
    avatar: user.avatarUrl?.trim() || DEFAULT_USER_AVATAR
  };
}

export function getCreatorDisplay(creator: {
  displayName?: string | null;
  avatarUrl?: string | null;
  account?: AccountLike | null;
}) {
  return {
    name: creator.displayName?.trim() || creator.account?.displayName?.trim() || "Creator dCreator",
    avatar: creator.avatarUrl?.trim() || creator.account?.avatarUrl?.trim() || DEFAULT_CREATOR_AVATAR
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
    name: brand.name?.trim() || brand.displayName?.trim() || brand.legalName?.trim() || "Brand dCreator",
    logo: brand.logoUrl?.trim() || brand.avatarUrl?.trim() || brand.owner?.avatarUrl?.trim() || DEFAULT_BRAND_LOGO
  };
}
