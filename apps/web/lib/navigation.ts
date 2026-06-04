export type Workspace = "user" | "creator" | "brand" | "admin";
export type RoleCode = "USER" | "CREATOR" | "BRAND_OWNER" | "BRAND_STAFF" | "ADMIN" | "OPS";
export type CapabilityCode = "user" | "creator" | "brand" | "admin";
export type WorkspaceAccessSubject = {
  roles: RoleCode[];
  capabilities: Record<CapabilityCode, boolean>;
};

export type NavItem = {
  href: string;
  label: string;
  description?: string;
  icon?: string;
  activePrefixes?: readonly string[];
  hidden?: boolean;
};
export type BreadcrumbItem = { href: string; label: string };

type WorkspaceConfig = {
  id: Workspace;
  label: string;
  title: string;
  description: string;
  defaultHref: string;
  routePrefixes: readonly string[];
  requiredCapability: CapabilityCode;
  navItems: readonly NavItem[];
};

const userNavItems: readonly NavItem[] = [
  { href: "/dashboard/user", label: "T\u1ed5ng quan c\u00e1 nh\u00e2n", description: "T\u1ed5ng quan t\u00e0i kho\u1ea3n c\u1ee7a b\u1ea1n", icon: "House" },
  { href: "/dashboard/user/wallet", label: "V\u00ed / N-Points", description: "S\u1ed1 d\u01b0 v\u00e0 l\u1ecbch s\u1eed giao d\u1ecbch", icon: "Wallet" },
  { href: "/dashboard/user/settings", label: "C\u00e0i \u0111\u1eb7t t\u00e0i kho\u1ea3n", description: "Th\u00f4ng tin c\u00e1 nh\u00e2n, m\u1eadt kh\u1ea9u, th\u00f4ng b\u00e1o", icon: "GearSix" }
];

const creatorNavItems: readonly NavItem[] = [
  { href: "/dashboard/creator", label: "T\u1ed5ng quan Creator", description: "Ti\u1ebfn \u0111\u1ed9 nhi\u1ec7m v\u1ee5 v\u00e0 hoa h\u1ed3ng", icon: "Gauge" },
  { href: "/dashboard/creator/jobs", label: "Campaign / Job", description: "Chi\u1ebfn d\u1ecbch c\u00f3 th\u1ec3 tham gia", icon: "Briefcase" },
  { href: "/dashboard/creator/wallet", label: "V\u00ed Creator", description: "Hoa h\u1ed3ng v\u00e0 payout", icon: "Wallet" },
  { href: "/dashboard/creator/profile", label: "C\u00e0i \u0111\u1eb7t Creator", description: "Portfolio, k\u00eanh x\u00e3 h\u1ed9i v\u00e0 th\u00f4ng tin Creator", icon: "UserCircle" }
];

const brandNavItems: readonly NavItem[] = [
  { href: "/dashboard/brand", label: "T\u1ed5ng quan Brand", description: "To\u00e0n c\u1ea3nh v\u1eadn h\u00e0nh Brand", icon: "Gauge" },
  { href: "/dashboard/brand/campaigns", label: "Campaign / Job", description: "T\u1ea1o v\u00e0 qu\u1ea3n l\u00fd campaign", icon: "Megaphone" },
  { href: "/dashboard/brand/mission-reviews", label: "Duy\u1ec7t nhi\u1ec7m v\u1ee5 Creator", description: "Duy\u1ec7t k\u1ecbch b\u1ea3n, video v\u00e0 ho\u00e0n th\u00e0nh", icon: "ClipboardText" },
  { href: "/dashboard/brand/mission-history", label: "L\u1ecbch S\u1eed nhi\u1ec7m v\u1ee5 c\u1ee7a Creator", description: "To\u00e0n b\u1ed9 Creator Mission theo campaign", icon: "Scroll" },
  { href: "/dashboard/brand/products", label: "S\u1ea3n ph\u1ea9m / SKU / Variant", description: "Qu\u1ea3n l\u00fd danh m\u1ee5c s\u1ea3n ph\u1ea9m", icon: "Package" },
  { href: "/dashboard/brand/upgrade", label: "\u0110\u0103ng k\u00fd n\u00e2ng c\u1ea5p vai tr\u00f2", description: "\u0110\u0103ng k\u00fd Creator/Brand", icon: "UserPlus" },
  {
    href: "/dashboard/brand/settings",
    label: "C\u00e0i \u0111\u1eb7t Brand",
    description: "V\u00ed N-Point, onboarding v\u00e0 h\u1ed3 s\u01a1 nh\u00e3n h\u00e0ng",
    icon: "GearSix",
    activePrefixes: ["/dashboard/brand/wallet", "/dashboard/brand/onboarding", "/dashboard/brand/profile"]
  }
];

const adminNavItems: readonly NavItem[] = [
  { href: "/admin", label: "Tổng quan Admin", description: "Toàn cảnh hệ thống", icon: "Gauge" },
  { href: "/admin/users", label: "Quản lý người dùng", description: "Quản lý tài khoản người dùng", icon: "UsersThree" },
  { href: "/admin/creators", label: "Quản lý Creator", description: "Quản lý toàn vòng đời Creator", icon: "UsersThree", activePrefixes: ["/admin/creator-requests", "/admin/creator-applications"] },
  { href: "/admin/brands", label: "Quản lý Brand", description: "Quản lý toàn vòng đời Brand", icon: "Storefront", activePrefixes: ["/admin/brand-requests", "/admin/brand-applications"] },
  { href: "/admin/campaigns", label: "Quản lý Campaign / Job", description: "Vận hành campaign/job toàn hệ thống", icon: "Megaphone", activePrefixes: ["/admin/campaign-applications"] },
  { href: "/admin/mission-reviews", label: "Duyệt nhiệm vụ Creator", description: "Duyệt nhận nhiệm vụ, kịch bản, video và hoàn thành", icon: "ClipboardText", activePrefixes: ["/admin/mission-reviews", "/admin/mission-history", "/admin/mission-applications", "/admin/mission-video-reviews", "/admin/mission-final-reviews", "/admin/creator-missions"] },
  { href: "/admin/proofs", label: "Quản lý Mission & Proof", description: "Quản lý workflow proof và tranh chấp", icon: "ClipboardText", activePrefixes: ["/admin/proofs", "/admin/content-review"] },
  { href: "/admin/vouchers", label: "Quản lý Voucher / Reward", description: "Theo dõi và can thiệp voucher/reward", icon: "Gift" },
  { href: "/admin/finance", label: "Finance & Payout", description: "Tài chính và chi trả", icon: "Bank", activePrefixes: ["/admin/payouts"] },
  { href: "/admin/n-point-requests", label: "N-Point Transactions", description: "Nạp điểm, refund, đối soát giao dịch điểm", icon: "Coins" },
  { href: "/admin/risk", label: "Risk & Fraud", description: "Phát hiện rủi ro và gian lận", icon: "ShieldWarning" },
  { href: "/admin/audit", label: "Audit Log", description: "Nhật ký vận hành hệ thống", icon: "Scroll", activePrefixes: ["/admin/audit-log"] },
  { href: "/admin/notifications", label: "Notifications", description: "Thông báo hệ thống", icon: "Bell" },
  { href: "/admin/settings", label: "System Settings", description: "Thiết lập hệ thống", icon: "SlidersHorizontal" }
];

const WORKSPACES: readonly WorkspaceConfig[] = [
  {
    id: "user",
    label: "T\u00e0i kho\u1ea3n c\u00e1 nh\u00e2n",
    title: "T\u00e0i kho\u1ea3n c\u00e1 nh\u00e2n",
    description: "Qu\u1ea3n l\u00fd h\u1ed3 s\u01a1 c\u00e1 nh\u00e2n, v\u00ed, voucher v\u00e0 nhi\u1ec7m v\u1ee5 c\u1ee7a b\u1ea1n",
    defaultHref: "/dashboard/user",
    routePrefixes: ["/dashboard/user"],
    requiredCapability: "user",
    navItems: userNavItems
  },
  {
    id: "creator",
    label: "B\u1ea3ng \u0111i\u1ec1u khi\u1ec3n Creator",
    title: "B\u1ea3ng \u0111i\u1ec1u khi\u1ec3n Creator",
    description: "Qu\u1ea3n l\u00fd job, nhi\u1ec7m v\u1ee5 v\u00e0 hoa h\u1ed3ng",
    defaultHref: "/dashboard/creator",
    routePrefixes: ["/dashboard/creator"],
    requiredCapability: "creator",
    navItems: creatorNavItems
  },
  {
    id: "brand",
    label: "B\u1ea3ng \u0111i\u1ec1u khi\u1ec3n Nh\u00e3n h\u00e0ng",
    title: "B\u1ea3ng \u0111i\u1ec1u khi\u1ec3n Nh\u00e3n h\u00e0ng",
    description: "Qu\u1ea3n l\u00fd onboarding, campaign, creator v\u00e0 qu\u1ef9 Brand",
    defaultHref: "/dashboard/brand",
    routePrefixes: ["/dashboard/brand", "/brand"],
    requiredCapability: "brand",
    navItems: brandNavItems
  },
  {
    id: "admin",
    label: "Bảng điều khiển Admin",
    title: "Bảng điều khiển Admin",
    description: "Vận hành, quản lý và quản trị hệ thống",
    defaultHref: "/admin",
    routePrefixes: ["/admin", "/dashboard/admin", "/ops"],
    requiredCapability: "admin",
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

function toAccessSubject(input: WorkspaceAccessSubject | RoleCode[]): WorkspaceAccessSubject {
  if (Array.isArray(input)) {
    const roles = input;
    return {
      roles,
      capabilities: {
        user: true,
        creator: roles.includes("CREATOR"),
        brand: roles.includes("BRAND_OWNER") || roles.includes("BRAND_STAFF"),
        admin: roles.includes("ADMIN") || roles.includes("OPS")
      }
    };
  }
  return input;
}

export function canAccessWorkspace(workspace: Workspace, subjectOrRoles: WorkspaceAccessSubject | RoleCode[]): boolean {
  const config = WORKSPACES.find((item) => item.id === workspace);
  if (!config) return false;
  const subject = toAccessSubject(subjectOrRoles);
  return Boolean(subject.capabilities[config.requiredCapability]);
}

export function getAvailableWorkspaces(subjectOrRoles: WorkspaceAccessSubject | RoleCode[]) {
  return WORKSPACES.filter((workspace) => canAccessWorkspace(workspace.id, subjectOrRoles)).map((workspace) => ({
    id: workspace.id,
    label: workspace.label,
    href: workspace.defaultHref
  }));
}

export function getWorkspaceConfig(workspace: Workspace): WorkspaceConfig {
  return WORKSPACES.find((item) => item.id === workspace) ?? WORKSPACES[0]!;
}

export function getNavItemsForWorkspace(workspace: Workspace, subjectOrRoles: WorkspaceAccessSubject | RoleCode[]) {
  if (!canAccessWorkspace(workspace, subjectOrRoles)) return [] as NavItem[];
  return [...getWorkspaceConfig(workspace).navItems].filter((item) => !item.hidden);
}

const breadcrumbLabelMap: Record<string, string> = {
  "/dashboard/user": "Dashboard c\u00e1 nh\u00e2n",
  "/dashboard/user/profile": "H\u1ed3 s\u01a1 c\u00e1 nh\u00e2n",
  "/dashboard/user/wallet": "V\u00ed / N-Points",
  "/dashboard/user/vouchers": "Voucher c\u1ee7a t\u00f4i",
  "/dashboard/user/campaigns": "Campaign \u0111\u00e3 tham gia",
  "/dashboard/user/missions": "Nhi\u1ec7m v\u1ee5 c\u1ee7a t\u00f4i",
  "/dashboard/user/role-requests": "\u0110\u0103ng k\u00fd n\u00e2ng c\u1ea5p vai tr\u00f2",
  "/dashboard/user/upgrade": "\u0110\u0103ng k\u00fd n\u00e2ng c\u1ea5p vai tr\u00f2",
  "/dashboard/user/settings": "C\u00e0i \u0111\u1eb7t t\u00e0i kho\u1ea3n",
  "/dashboard/creator": "Creator Dashboard",
  "/dashboard/creator/jobs": "Campaign / Job",
  "/dashboard/creator/missions": "Nhi\u1ec7m v\u1ee5 c\u1ee7a t\u00f4i",
  "/dashboard/creator/channels": "K\u00eanh m\u1ea1ng x\u00e3 h\u1ed9i",
  "/dashboard/creator/profile": "C\u00e0i \u0111\u1eb7t Creator",
  "/dashboard/creator/wallet": "V\u00ed Creator",
  "/dashboard/creator/upgrade": "\u0110\u0103ng k\u00fd n\u00e2ng c\u1ea5p vai tr\u00f2",
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
  "/dashboard/brand/upgrade": "\u0110\u0103ng k\u00fd n\u00e2ng c\u1ea5p vai tr\u00f2",
  "/dashboard/brand/settings": "C\u00e0i \u0111\u1eb7t Brand",
  "/admin": "Admin",
  "/admin/users": "Người dùng",
  "/admin/creator-requests": "Quản lý Creator",
  "/admin/creators": "Quản lý Creator",
  "/admin/brand-requests": "Quản lý Brand",
  "/admin/brands": "Quản lý Brand",
  "/admin/campaigns": "Quản lý Campaign / Job",
  "/admin/mission-reviews": "Quản lý nhiệm vụ Creator",
  "/admin/mission-history": "Lịch sử nhiệm vụ",
  "/admin/proofs": "Quản lý Mission & Proof",
  "/admin/mission-applications": "Duyệt nhận nhiệm vụ",
  "/admin/mission-video-reviews": "Duyệt video",
  "/admin/mission-final-reviews": "Duyệt hoàn thành",
  "/admin/finance": "Finance / payout",
  "/admin/n-point-requests": "X\u1eed l\u00fd n\u1ea1p N-Point",
  "/admin/audit": "Audit log",
  "/admin/audit-log": "Audit log",
  "/admin/notifications": "Notifications",
  "/admin/settings": "System Settings"
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
