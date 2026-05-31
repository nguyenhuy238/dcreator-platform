import { getNavItemsForWorkspace } from "@/lib/navigation";

export type BrandNavItem = {
  href: string;
  label: string;
  description?: string;
  activePrefixes?: readonly string[];
};

export const brandNav = getNavItemsForWorkspace("brand", ["BRAND_OWNER", "BRAND_STAFF"]);
