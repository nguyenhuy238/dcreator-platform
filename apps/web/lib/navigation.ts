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
  { href: "/dashboard/creator/profile", label: "H\u1ed3 s\u01a1 Creator", description: "Portfolio v\u00e0 th\u00f4ng tin Creator" },
  { href: "/dashboard/creator/wallet", label: "V\u00ed Creator", description: "Hoa h\u1ed3ng v\u00e0 payout" }
];

const brandNavItems: readonly NavItem[] = [
  { href: "/dashboard/brand", label: "T\u1ed5ng quan Brand", description: "To\u00e0n c\u1ea3nh v\u1eadn h\u00e0nh Brand" },
  { href: "/dashboard/brand/subscriptions", label: "M\u1ee5c ti\u00eau g\u00f3i", description: "Ch\u1ecdn g\u00f3i \u0111\u0103ng k\u00fd d\u00e0nh cho Brand" },
  { href: "/dashboard/brand/wallet", label: "V\u00ed N-Point", description: "S\u1ed1 d\u01b0 N-Point v\u00e0 y\u00eau c\u1ea7u n\u1ea1p/ho\u00e0n ti\u1ec1n" },
  { href: "/dashboard/brand/onboarding", label: "Onboarding / BCC", description: "H\u1ed3 s\u01a1 ph\u00e1p l\u00fd v\u00e0 BCC" },
  { href: "/dashboard/brand/profile", label: "H\u1ed3 s\u01a1 nh\u00e3n h\u00e0ng", description: "Th\u00f4ng tin nh\u00e3n h\u00e0ng" },
  { href: "/dashboard/brand/campaigns", label: "Campaign / Job", description: "T\u1ea1o v\u00e0 qu\u1ea3n l\u00fd campaign" },
  { href: "/dashboard/brand/mission-reviews", label: "Duy\u1ec7t nhi\u1ec7m v\u1ee5 Creator", description: "Duy\u1ec7t k\u1ecbch b\u1ea3n, video v\u00e0 ho\u00e0n th\u00e0nh" },
  { href: "/dashboard/brand/mission-history", label: "L\u1ecbch s\u1eed nhi\u1ec7m v\u1ee5", description: "To\u00e0n b\u1ed9 Creator Mission theo campaign" },
  { href: "/dashboard/brand/settings", label: "C\u00e0i \u0111\u1eb7t Brand", description: "Thi\u1ebft l\u1eadp v\u1eadn h\u00e0nh Brand" }
];

const adminNavItems: readonly NavItem[] = [
  { href: "/admin", label: "T\u1ed5ng quan Admin", description: "To\u00e0n c\u1ea3nh h\u1ec7 th\u1ed1ng" },
  { href: "/admin/users", label: "Ng\u01b0\u1eddi d\u00f9ng", description: "Qu\u1ea3n l\u00fd t\u00e0i kho\u1ea3n ng\u01b0\u1eddi d\u00f9ng" },
  { href: "/admin/creators", label: "Duy\u1ec7t Creator", description: "Duy\u1ec7t h\u1ed3 s\u01a1 Creator" },
  { href: "/admin/brands", label: "Duy\u1ec7t Brand", description: "Duy\u1ec7t h\u1ed3 s\u01a1 Brand" },
  { href: "/admin/campaigns", label: "Duy\u1ec7t campaign", description: "Ki\u1ec3m duy\u1ec7t campaign/job" },
  { href: "/admin/proofs", label: "Duy\u1ec7t proof/video", description: "X\u1eed l\u00fd h\u00e0ng ch\u1ee3 proof/video Creator" },
  { href: "/admin/mission-history", label: "L\u1ecbch s\u1eed nhi\u1ec7m v\u1ee5", description: "To\u00e0n b\u1ed9 l\u1ecbch s\u1eed Creator Mission" },
  { href: "/admin/finance", label: "Finance / payout", description: "T\u00e0i ch\u00ednh v\u00e0 chi tr\u1ea3" },
  { href: "/admin/n-point-requests", label: "X\u1eed l\u00fd n\u1ea1p N-Point", description: "Duy\u1ec7t n\u1ea1p \u0111i\u1ec3m v\u00e0 x\u1eed l\u00fd ho\u00e0n ti\u1ec1n" },
  { href: "/admin/audit-log", label: "Audit log", description: "Nh\u1eadt k\u00fd v\u1eadn h\u00e0nh h\u1ec7 th\u1ed1ng" },
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
    label: "Bảng điều khiển Admin",
    title: "Bảng điều khiển Admin",
    description: "Vận hành, quản lý và quản trị hệ thống",
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
  "/dashboard/brand/subscriptions": "M\u1ee5c ti\u00eau g\u00f3i",
  "/dashboard/brand/onboarding": "Onboarding / BCC",
  "/dashboard/brand/profile": "Hồ sơ nhãn hàng",
  "/dashboard/brand/campaigns": "Campaign / Job",
  "/dashboard/brand/applications": "Creator \u1ee9ng tuy\u1ec3n",
  "/dashboard/brand/mission-reviews": "Duy\u1ec7t nhi\u1ec7m v\u1ee5 Creator",
  "/dashboard/brand/mission-history": "L\u1ecbch s\u1eed nhi\u1ec7m v\u1ee5",
  "/dashboard/brand/proofs": "Duy\u1ec7t proof / video",
  "/dashboard/brand/analytics": "KPI / Analytics",
  "/dashboard/brand/wallet": "V\u00ed N-Point",
  "/dashboard/brand/members": "Th\u00e0nh vi\u00ean Brand",
  "/dashboard/brand/settings": "C\u00e0i \u0111\u1eb7t Brand",
  "/admin": "Admin",
  "/admin/users": "Người dùng",
  "/admin/creator-requests": "Quản lý Creator",
  "/admin/creators": "Quản lý Creator",
  "/admin/brand-requests": "Quản lý Brand",
  "/admin/brands": "Quản lý Brand",
  "/admin/campaigns": "Quản lý campaign",
  "/admin/mission-reviews": "Quản lý nhiệm vụ Creator",
  "/admin/mission-history": "Lịch sử nhiệm vụ",
  "/admin/proofs": "Duyệt video",
  "/admin/mission-applications": "Duyệt nhận nhiệm vụ",
  "/admin/mission-video-reviews": "Duyệt video",
  "/admin/mission-final-reviews": "Duyệt hoàn thành",
  "/admin/finance": "Finance / payout",
  "/admin/n-point-requests": "X\u1eed l\u00fd n\u1ea1p N-Point",
  "/admin/audit": "Audit log",
  "/admin/audit-log": "Audit log",
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
