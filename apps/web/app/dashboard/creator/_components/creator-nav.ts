import { getNavItemsForWorkspace } from "@/lib/navigation";

export type CreatorNavItem = {
  href: string;
  label: string;
  description?: string;
};

export const creatorNav = getNavItemsForWorkspace("creator", ["CREATOR"]);
