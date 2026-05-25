export type Workspace = "user" | "creator" | "brand" | "admin";
export type RoleCode = "USER" | "CREATOR" | "BRAND_OWNER" | "BRAND_STAFF" | "ADMIN" | "OPS";

export type NavItem = {
  href: string;
  label: string;
  description?: string;
};
export type BreadcrumbItem = { href: string; label: string };

type WorkspaceConfig = {
  id: Workspace;
  label: string;
  title: string;
  description: string;
  defaultHref: string;
  routePrefixes: readonly string[];
  allowedRoles: readonly RoleCode[];
  navItems: readonly NavItem[];
};

const userNavItems: readonly NavItem[] = [
  { href: "/dashboard/user", label: "T\u1ed5ng quan c\u00e1 nh\u00e2n", description: "T\u1ed5ng quan t\u00e0i kho\u1ea3n c\u1ee7a b\u1ea1n" },
  { href: "/dashboard/user/profile", label: "H\u1ed3 s\u01a1 c\u00e1 nh\u00e2n", description: "Th\u00f4ng tin c\u00e1 nh\u00e2n v\u00e0 x\u00e1c minh" },
  { href: "/dashboard/user/wallet", label: "V\u00ed / N-Points", description: "S\u1ed1 d\u01b0 v\u00e0 l\u1ecbch s\u1eed giao d\u1ecbch" },
  { href: "/dashboard/user/vouchers", label: "Voucher c\u1ee7a t\u00f4i", description: "Voucher \u0111\u00e3 nh\u1eadn v\u00e0 tr\u1ea1ng th\u00e1i" },
  { href: "/dashboard/user/campaigns", label: "Campaign \u0111\u00e3 tham gia", description: "L\u1ecbch s\u1eed \u1ee7ng h\u1ed9 v\u00e0 ph\u1ea7n th\u01b0\u1edfng" },
  { href: "/dashboard/user/missions", label: "Nhi\u1ec7m v\u1ee5 c\u1ee7a t\u00f4i", description: "Nhi\u1ec7m v\u1ee5 user v\u00e0 proof \u0111\u00e3 n\u1ed9p" },
  { href: "/dashboard/user/role-requests", label: "\u0110\u0103ng k\u00fd n\u00e2ng c\u1ea5p vai tr\u00f2", description: "\u0110\u0103ng k\u00fd Creator/Brand" },
  { href: "/dashboard/user/settings", label: "C\u00e0i \u0111\u1eb7t t\u00e0i kho\u1ea3n", description: "M\u1eadt kh\u1ea9u, th\u00f4ng b\u00e1o, \u0111\u0103ng xu\u1ea5t" }
];

const creatorNavItems: readonly NavItem[] = [
  { href: "/dashboard/creator", label: "T\u1ed5ng quan Creator", description: "Ti\u1ebfn \u0111\u1ed9 nhi\u1ec7m v\u1ee5 v\u00e0 hoa h\u1ed3ng" },
  { href: "/dashboard/creator/jobs", label: "Campaign / Job", description: "Chi\u1ebfn d\u1ecbch c\u00f3 th\u1ec3 tham gia" },
  { href: "/dashboard/creator/missions", label: "Nhi\u1ec7m v\u1ee5 c\u1ee7a t\u00f4i", description: "Danh s\u00e1ch nhi\u1ec7m v\u1ee5 Creator" },
  { href: "/dashboard/creator/channels", label: "K\u00eanh m\u1ea1ng x\u00e3 h\u1ed9i", description: "Qu\u1ea3n l\u00fd social channels" },
  { href: "/dashboard/creator/profile", label: "H\u1ed3 s\u01a1 Creator", description: "Portfolio v\u00e0 th\u00f4ng tin Creator" },
  { href: "/dashboard/creator/wallet", label: "V\u00ed Creator", description: "Hoa h\u1ed3ng v\u00e0 payout" }
];

const brandNavItems: readonly NavItem[] = [
  { href: "/dashboard/brand", label: "T\u1ed5ng quan Brand", description: "To\u00e0n c\u1ea3nh v\u1eadn h\u00e0nh Brand" },
  { href: "/dashboard/brand/onboarding", label: "Onboarding / BCC", description: "H\u1ed3 s\u01a1 ph\u00e1p l\u00fd v\u00e0 BCC" },
  { href: "/dashboard/brand/profile", label: "H\u1ed3 s\u01a1 nh\u00e3n h\u00e0ng", description: "Th\u00f4ng tin nh\u00e3n h\u00e0ng" },
  { href: "/dashboard/brand/products", label: "S\u1ea3n ph\u1ea9m & l\u00f4 h\u00e0ng", description: "Qu\u1ea3n l\u00fd s\u1ea3n ph\u1ea9m v\u00e0 t\u1ed3n kho" },
  { href: "/dashboard/brand/campaigns", label: "Campaign / Job", description: "T\u1ea1o v\u00e0 qu\u1ea3n l\u00fd campaign" },
  { href: "/dashboard/brand/applications", label: "Creator \u1ee9ng tuy\u1ec3n", description: "\u0110\u01a1n \u1ee9ng tuy\u1ec3n t\u1eeb Creator" },
  { href: "/dashboard/brand/mission-reviews", label: "Duy\u1ec7t nhi\u1ec7m v\u1ee5 Creator", description: "Duy\u1ec7t k\u1ecbch b\u1ea3n, video v\u00e0 ho\u00e0n th\u00e0nh" },
  { href: "/dashboard/brand/mission-history", label: "L\u1ecbch s\u1eed nhi\u1ec7m v\u1ee5", description: "To\u00e0n b\u1ed9 Creator Mission theo campaign" },
  { href: "/dashboard/brand/proofs", label: "Duy\u1ec7t proof / video", description: "Duy\u1ec7t n\u1ed9i dung n\u1ed9p l\u00ean" },
  { href: "/dashboard/brand/analytics", label: "KPI / Analytics", description: "Ph\u00e2n t\u00edch hi\u1ec7u qu\u1ea3 campaign" },
  { href: "/dashboard/brand/wallet", label: "Qu\u1ef9 Brand", description: "Qu\u1ef9 prepaid v\u00e0 giao d\u1ecbch" },
  { href: "/dashboard/brand/members", label: "Th\u00e0nh vi\u00ean Brand", description: "Qu\u1ea3n l\u00fd team nh\u00e3n h\u00e0ng" },
  { href: "/dashboard/brand/settings", label: "C\u00e0i \u0111\u1eb7t Brand", description: "Thi\u1ebft l\u1eadp v\u1eadn h\u00e0nh Brand" }
];

const adminNavItems: readonly NavItem[] = [
  { href: "/admin", label: "T\u1ed5ng quan Admin", description: "To\u00e0n c\u1ea3nh h\u1ec7 th\u1ed1ng" },
  { href: "/admin/users", label: "Ng\u01b0\u1eddi d\u00f9ng", description: "Qu\u1ea3n l\u00fd t\u00e0i kho\u1ea3n ng\u01b0\u1eddi d\u00f9ng" },
  { href: "/admin/creator-requests", label: "Duy\u1ec7t Creator", description: "Duy\u1ec7t h\u1ed3 s\u01a1 Creator" },
  { href: "/admin/brand-requests", label: "Duy\u1ec7t Brand", description: "Duy\u1ec7t h\u1ed3 s\u01a1 Brand" },
  { href: "/admin/products", label: "Duy\u1ec7t s\u1ea3n ph\u1ea9m", description: "Ki\u1ec3m duy\u1ec7t s\u1ea3n ph\u1ea9m/l\u00f4 h\u00e0ng" },
  { href: "/admin/campaigns", label: "Duy\u1ec7t campaign", description: "Ki\u1ec3m duy\u1ec7t campaign/job" },
  { href: "/admin/mission-reviews", label: "Duy\u1ec7t nhi\u1ec7m v\u1ee5 Creator", description: "G\u1ed9p duy\u1ec7t k\u1ecbch b\u1ea3n, video v\u00e0 ho\u00e0n th\u00e0nh" },
  { href: "/admin/mission-history", label: "L\u1ecbch s\u1eed nhi\u1ec7m v\u1ee5", description: "To\u00e0n b\u1ed9 l\u1ecbch s\u1eed Creator Mission" },
  { href: "/admin/finance", label: "Finance / payout", description: "T\u00e0i ch\u00ednh v\u00e0 chi tr\u1ea3" },
  { href: "/admin/audit", label: "Audit log", description: "Nh\u1eadt k\u00fd v\u1eadn h\u00e0nh h\u1ec7 th\u1ed1ng" },
  { href: "/admin/notifications", label: "Notification", description: "Th\u00f4ng b\u00e1o h\u1ec7 th\u1ed1ng" },
  { href: "/admin/settings", label: "System settings", description: "Thi\u1ebft l\u1eadp h\u1ec7 th\u1ed1ng" }
];

const WORKSPACES: readonly WorkspaceConfig[] = [
  {
    id: "user",
    label: "T\u00e0i kho\u1ea3n c\u00e1 nh\u00e2n",
    title: "T\u00e0i kho\u1ea3n c\u00e1 nh\u00e2n",
    description: "Qu\u1ea3n l\u00fd h\u1ed3 s\u01a1 c\u00e1 nh\u00e2n, v\u00ed, voucher v\u00e0 nhi\u1ec7m v\u1ee5 c\u1ee7a b\u1ea1n",
    defaultHref: "/dashboard/user",
    routePrefixes: ["/dashboard/user"],
    allowedRoles: ["USER", "CREATOR", "BRAND_OWNER", "BRAND_STAFF", "ADMIN", "OPS"],
    navItems: userNavItems
  },
  {
    id: "creator",
    label: "B\u1ea3ng \u0111i\u1ec1u khi\u1ec3n Creator",
    title: "B\u1ea3ng \u0111i\u1ec1u khi\u1ec3n Creator",
    description: "Qu\u1ea3n l\u00fd job, nhi\u1ec7m v\u1ee5 v\u00e0 hoa h\u1ed3ng",
    defaultHref: "/dashboard/creator",
    routePrefixes: ["/dashboard/creator"],
    allowedRoles: ["CREATOR"],
    navItems: creatorNavItems
  },
  {
    id: "brand",
    label: "B\u1ea3ng \u0111i\u1ec1u khi\u1ec3n Nh\u00e3n h\u00e0ng",
    title: "B\u1ea3ng \u0111i\u1ec1u khi\u1ec3n Nh\u00e3n h\u00e0ng",
    description: "Qu\u1ea3n l\u00fd onboarding, campaign, creator v\u00e0 qu\u1ef9 Brand",
    defaultHref: "/dashboard/brand",
    routePrefixes: ["/dashboard/brand", "/brand"],
    allowedRoles: ["BRAND_OWNER", "BRAND_STAFF"],
    navItems: brandNavItems
  },
  {
    id: "admin",
    label: "B\u1ea3ng \u0111i\u1ec1u khi\u1ec3n Admin",
    title: "B\u1ea3ng \u0111i\u1ec1u khi\u1ec3n Admin",
    description: "V\u1eadn h\u00e0nh, ki\u1ec3m duy\u1ec7t v\u00e0 qu\u1ea3n tr\u1ecb h\u1ec7 th\u1ed1ng",
    defaultHref: "/admin",
    routePrefixes: ["/admin", "/dashboard/admin", "/ops"],
    allowedRoles: ["ADMIN", "OPS"],
    navItems: adminNavItems
  }
] as const;

export function getWorkspaceForPath(pathname: string): Workspace {
  for (const workspace of WORKSPACES) {
    if (workspace.routePrefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))) {
      return workspace.id;
    }
  }
  return "user";
}

export function canAccessWorkspace(workspace: Workspace, roles: RoleCode[]): boolean {
  const config = WORKSPACES.find((item) => item.id === workspace);
  if (!config) return false;
  return roles.some((role) => config.allowedRoles.includes(role));
}

export function getAvailableWorkspaces(roles: RoleCode[]) {
  return WORKSPACES.filter((workspace) => canAccessWorkspace(workspace.id, roles)).map((workspace) => ({
    id: workspace.id,
    label: workspace.label,
    href: workspace.defaultHref
  }));
}

export function getWorkspaceConfig(workspace: Workspace): WorkspaceConfig {
  return WORKSPACES.find((item) => item.id === workspace) ?? WORKSPACES[0]!;
}

export function getNavItemsForWorkspace(workspace: Workspace, roles: RoleCode[]) {
  if (!canAccessWorkspace(workspace, roles)) return [] as NavItem[];
  return [...getWorkspaceConfig(workspace).navItems];
}

const breadcrumbLabelMap: Record<string, string> = {
  "/dashboard/user": "Dashboard c\u00e1 nh\u00e2n",
  "/dashboard/user/profile": "H\u1ed3 s\u01a1 c\u00e1 nh\u00e2n",
  "/dashboard/user/wallet": "V\u00ed / N-Points",
  "/dashboard/user/vouchers": "Voucher c\u1ee7a t\u00f4i",
  "/dashboard/user/campaigns": "Campaign \u0111\u00e3 tham gia",
  "/dashboard/user/missions": "Nhi\u1ec7m v\u1ee5 c\u1ee7a t\u00f4i",
  "/dashboard/user/role-requests": "\u0110\u0103ng k\u00fd n\u00e2ng c\u1ea5p vai tr\u00f2",
  "/dashboard/user/settings": "C\u00e0i \u0111\u1eb7t t\u00e0i kho\u1ea3n",
  "/dashboard/creator": "Creator Dashboard",
  "/dashboard/creator/jobs": "Campaign / Job",
  "/dashboard/creator/missions": "Nhi\u1ec7m v\u1ee5 c\u1ee7a t\u00f4i",
  "/dashboard/creator/channels": "K\u00eanh m\u1ea1ng x\u00e3 h\u1ed9i",
  "/dashboard/creator/profile": "H\u1ed3 s\u01a1 Creator",
  "/dashboard/creator/wallet": "V\u00ed Creator",
  "/dashboard/brand": "Brand Dashboard",
  "/dashboard/brand/onboarding": "Onboarding / BCC",
  "/dashboard/brand/profile": "H\u1ed3 s\u01a1 nh\u00e3n h\u00e0ng",
  "/dashboard/brand/products": "S\u1ea3n ph\u1ea9m & l\u00f4 h\u00e0ng",
  "/dashboard/brand/campaigns": "Campaign / Job",
  "/dashboard/brand/applications": "Creator \u1ee9ng tuy\u1ec3n",
  "/dashboard/brand/mission-reviews": "Duy\u1ec7t nhi\u1ec7m v\u1ee5 Creator",
  "/dashboard/brand/mission-history": "L\u1ecbch s\u1eed nhi\u1ec7m v\u1ee5",
  "/dashboard/brand/proofs": "Duy\u1ec7t proof / video",
  "/dashboard/brand/analytics": "KPI / Analytics",
  "/dashboard/brand/wallet": "Qu\u1ef9 Brand",
  "/dashboard/brand/members": "Th\u00e0nh vi\u00ean Brand",
  "/dashboard/brand/settings": "C\u00e0i \u0111\u1eb7t Brand",
  "/admin": "Admin",
  "/admin/users": "Ng\u01b0\u1eddi d\u00f9ng",
  "/admin/creator-requests": "Duy\u1ec7t Creator",
  "/admin/brand-requests": "Duy\u1ec7t Brand",
  "/admin/products": "Duy\u1ec7t s\u1ea3n ph\u1ea9m",
  "/admin/campaigns": "Duy\u1ec7t campaign",
  "/admin/mission-reviews": "Duy\u1ec7t nhi\u1ec7m v\u1ee5 Creator",
  "/admin/mission-history": "L\u1ecbch s\u1eed nhi\u1ec7m v\u1ee5",
  "/admin/proofs": "Duy\u1ec7t video",
  "/admin/mission-applications": "Duy\u1ec7t nh\u1eadn nhi\u1ec7m v\u1ee5",
  "/admin/mission-video-reviews": "Duy\u1ec7t video",
  "/admin/mission-final-reviews": "Duy\u1ec7t ho\u00e0n th\u00e0nh",
  "/admin/finance": "Finance / payout",
  "/admin/audit": "Audit log",
  "/admin/notifications": "Notification",
  "/admin/settings": "System settings"
};

function prettifySegment(segment: string) {
  return segment.replace(/-/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

export function getBreadcrumbsForPath(pathname: string, workspace: Workspace): BreadcrumbItem[] {
  const segments = pathname.split("/").filter(Boolean);
  const root = getWorkspaceConfig(workspace);
  const crumbs: BreadcrumbItem[] = [{ href: root.defaultHref, label: root.title }];
  for (let index = 0; index < segments.length; index += 1) {
    const href = `/${segments.slice(0, index + 1).join("/")}`;
    if (href === root.defaultHref) continue;
    const label = breadcrumbLabelMap[href] ?? prettifySegment(segments[index]!);
    crumbs.push({ href, label });
  }
  return crumbs;
}
