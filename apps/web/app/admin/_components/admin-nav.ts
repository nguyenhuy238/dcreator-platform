import { getNavItemsForWorkspace } from "@/lib/navigation";

export type AdminNavItem = {
  href: string;
  label: string;
  description?: string;
  isComingSoon?: boolean;
};

export const adminNav = getNavItemsForWorkspace("admin", ["ADMIN", "OPS"]);
