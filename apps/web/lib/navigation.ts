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
  { href: "/dashboard/creator", label: "Tổng quan nhà sáng tạo", description: "Tiến độ nhiệm vụ và hoa hồng", icon: "Gauge" },
  { href: "/dashboard/creator/analytics", label: "Phân tích nhà sáng tạo", description: "Chỉ số nhiệm vụ, bằng chứng, doanh thu và hoa hồng", icon: "ClipboardText" },
  { href: "/dashboard/creator/jobs", label: "Chiến dịch / Nhiệm vụ", description: "Chiến dịch có thể tham gia", icon: "Briefcase" },
  { href: "/dashboard/creator/wallet", label: "Ví nhà sáng tạo", description: "Hoa hồng và chi trả", icon: "Wallet" },
  { href: "/dashboard/creator/profile", label: "Cài đặt nhà sáng tạo", description: "Hồ sơ, kênh xã hội và thông tin nhà sáng tạo", icon: "UserCircle" }
];

const brandNavItems: readonly NavItem[] = [
  { href: "/dashboard/brand", label: "Tổng quan nhãn hàng", description: "Toàn cảnh vận hành nhãn hàng", icon: "Gauge" },
  { href: "/dashboard/brand/analytics", label: "Phân tích nhãn hàng", description: "Chỉ số nhà sáng tạo, bằng chứng, doanh thu và hoa hồng", icon: "ClipboardText" },
  { href: "/dashboard/brand/campaigns", label: "Chiến dịch / Nhiệm vụ", description: "Tạo và quản lý chiến dịch", icon: "Megaphone" },
  { href: "/dashboard/brand/mission-history", label: "Lịch sử nhiệm vụ của nhà sáng tạo", description: "Toàn bộ nhiệm vụ nhà sáng tạo theo chiến dịch", icon: "Scroll" },
  {
    href: "/dashboard/brand/settings",
    label: "Cài đặt nhãn hàng",
    description: "Ví N-Point, thiết lập ban đầu và hồ sơ nhãn hàng",
    icon: "GearSix",
    activePrefixes: ["/dashboard/brand/wallet", "/dashboard/brand/onboarding", "/dashboard/brand/profile"]
  }
];

const adminNavItems: readonly NavItem[] = [
  { href: "/admin", label: "Tổng quan Admin", description: "Toàn cảnh hệ thống", icon: "Gauge" },
  { href: "/admin/analytics", label: "Phân tích hệ thống", description: "Tăng trưởng, bằng chứng, doanh thu và xếp hạng", icon: "ClipboardText" },
  { href: "/admin/users", label: "Quản lý người dùng", description: "Quản lý tài khoản người dùng", icon: "UsersThree" },
  { href: "/admin/creators", label: "Quản lý nhà sáng tạo", description: "Quản lý toàn vòng đời nhà sáng tạo", icon: "UsersThree", activePrefixes: ["/admin/creator-requests", "/admin/creator-applications"] },
  { href: "/admin/brands", label: "Quản lý nhãn hàng", description: "Quản lý toàn vòng đời nhãn hàng", icon: "Storefront", activePrefixes: ["/admin/brand-requests", "/admin/brand-applications"] },
  { href: "/admin/campaigns", label: "Quản lý chiến dịch / nhiệm vụ", description: "Vận hành chiến dịch và nhiệm vụ toàn hệ thống", icon: "Megaphone", activePrefixes: ["/admin/campaign-applications"] },
  { href: "/admin/mission-reviews", label: "Duyệt nhiệm vụ nhà sáng tạo", description: "Duyệt nhận nhiệm vụ, kịch bản, video và hoàn thành", icon: "ClipboardText", activePrefixes: ["/admin/mission-reviews", "/admin/mission-history", "/admin/mission-applications", "/admin/mission-video-reviews", "/admin/mission-final-reviews", "/admin/creator-missions"] },
  { href: "/admin/brand-consultations", label: "Tư vấn nhãn hàng", description: "Khách hàng tiềm năng từ trang giới thiệu", icon: "IdentificationCard" },
  { href: "/admin/payouts", label: "Yêu cầu chi trả", description: "Danh sách yêu cầu chi trả", icon: "Bank" },
  { href: "/admin/finance", label: "Tài chính và chi trả", description: "Tài chính và chi trả", icon: "Bank", activePrefixes: ["/admin/payouts"] },
  { href: "/admin/n-point-requests", label: "Giao dịch N-Point", description: "Nạp điểm, hoàn tiền, đối soát giao dịch điểm", icon: "Coins" },
  { href: "/admin/risk", label: "Rủi ro và gian lận", description: "Phát hiện rủi ro và gian lận", icon: "ShieldWarning" },
  { href: "/admin/audit", label: "Nhật ký kiểm toán", description: "Nhật ký vận hành hệ thống", icon: "Scroll", activePrefixes: ["/admin/audit-log"] },
  { href: "/admin/notifications", label: "Thông báo", description: "Thông báo hệ thống", icon: "Bell" },
  { href: "/admin/settings", label: "Thiết lập hệ thống", description: "Thiết lập hệ thống", icon: "SlidersHorizontal" }
];

const WORKSPACES: readonly WorkspaceConfig[] = [
  {
    id: "user",
    label: "T\u00e0i kho\u1ea3n c\u00e1 nh\u00e2n",
    title: "T\u00e0i kho\u1ea3n c\u00e1 nh\u00e2n",
    description: "Qu\u1ea3n l\u00fd h\u1ed3 s\u01a1 c\u00e1 nh\u00e2n, nâng cấp vai trò",
    defaultHref: "/dashboard/user",
    routePrefixes: ["/dashboard/user"],
    requiredCapability: "user",
    navItems: userNavItems
  },
  {
    id: "creator",
    label: "Bảng điều khiển nhà sáng tạo",
    title: "Bảng điều khiển nhà sáng tạo",
    description: "Quản lý nhiệm vụ và hoa hồng",
    defaultHref: "/dashboard/creator",
    routePrefixes: ["/dashboard/creator"],
    requiredCapability: "creator",
    navItems: creatorNavItems
  },
  {
    id: "brand",
    label: "Bảng điều khiển nhãn hàng",
    title: "Bảng điều khiển nhãn hàng",
    description: "Quản lý thiết lập ban đầu, chiến dịch, nhà sáng tạo và quỹ nhãn hàng",
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
  "/dashboard/user": "Bảng điều khiển cá nhân",
  "/dashboard/user/profile": "H\u1ed3 s\u01a1 c\u00e1 nh\u00e2n",
  "/dashboard/user/wallet": "V\u00ed / N-Points",
  "/dashboard/user/vouchers": "Voucher c\u1ee7a t\u00f4i",
  "/dashboard/user/campaigns": "Chiến dịch đã tham gia",
  "/dashboard/user/missions": "Nhi\u1ec7m v\u1ee5 c\u1ee7a t\u00f4i",
  "/dashboard/user/role-requests": "\u0110\u0103ng k\u00fd n\u00e2ng c\u1ea5p vai tr\u00f2",
  "/dashboard/user/upgrade": "\u0110\u0103ng k\u00fd n\u00e2ng c\u1ea5p vai tr\u00f2",
  "/dashboard/user/settings": "C\u00e0i \u0111\u1eb7t t\u00e0i kho\u1ea3n",
  "/dashboard/creator": "Bảng điều khiển nhà sáng tạo",
  "/dashboard/creator/analytics": "Phân tích nhà sáng tạo",
  "/dashboard/creator/jobs": "Chiến dịch / Nhiệm vụ",
  "/dashboard/creator/missions": "Nhi\u1ec7m v\u1ee5 c\u1ee7a t\u00f4i",
  "/dashboard/creator/proofs": "Bằng chứng / Video",
  "/dashboard/creator/earnings": "Thu nhập",
  "/dashboard/creator/channels": "K\u00eanh m\u1ea1ng x\u00e3 h\u1ed9i",
  "/dashboard/creator/profile": "Cài đặt nhà sáng tạo",
  "/dashboard/creator/wallet": "Ví nhà sáng tạo",
  "/dashboard/creator/upgrade": "\u0110\u0103ng k\u00fd n\u00e2ng c\u1ea5p vai tr\u00f2",
  "/dashboard/brand": "Bảng điều khiển nhãn hàng",
  "/dashboard/brand/subscriptions": "M\u1ee5c ti\u00eau g\u00f3i",
  "/dashboard/brand/onboarding": "Thiết lập ban đầu / BCC",
  "/dashboard/brand/profile": "Hồ sơ nhãn hàng",
  "/dashboard/brand/campaigns": "Chiến dịch / Nhiệm vụ",
  "/dashboard/brand/applications": "Nhà sáng tạo ứng tuyển",
  "/dashboard/brand/mission-reviews": "Duyệt nhiệm vụ nhà sáng tạo",
  "/dashboard/brand/mission-history": "L\u1ecbch s\u1eed nhi\u1ec7m v\u1ee5",
  "/dashboard/brand/proofs": "Duyệt bằng chứng / video",
  "/dashboard/brand/products": "S\u1ea3n ph\u1ea9m",
  "/dashboard/brand/finance": "Tài chính",
  "/dashboard/brand/analytics": "Phân tích chỉ số",
  "/dashboard/brand/wallet": "V\u00ed N-Point",
  "/dashboard/brand/members": "Thành viên nhãn hàng",
  "/dashboard/brand/upgrade": "\u0110\u0103ng k\u00fd n\u00e2ng c\u1ea5p vai tr\u00f2",
  "/dashboard/brand/settings": "Cài đặt nhãn hàng",
  "/admin": "Admin",
  "/admin/overview": "Tổng quan Admin",
  "/admin/analytics": "Phân tích hệ thống",
  "/admin/reports": "Báo cáo",
  "/admin/users": "Người dùng",
  "/admin/creator-requests": "Quản lý nhà sáng tạo",
  "/admin/creators": "Quản lý nhà sáng tạo",
  "/admin/brand-requests": "Quản lý nhãn hàng",
  "/admin/brands": "Quản lý nhãn hàng",
  "/admin/campaigns": "Quản lý chiến dịch / nhiệm vụ",
  "/admin/mission-reviews": "Quản lý nhiệm vụ nhà sáng tạo",
  "/admin/mission-history": "Lịch sử nhiệm vụ",
  "/admin/mission-applications": "Duyệt nhận nhiệm vụ",
  "/admin/mission-video-reviews": "Duyệt video",
  "/admin/mission-final-reviews": "Duyệt hoàn thành",
  "/admin/brand-consultations": "Tư vấn nhãn hàng",
  "/admin/payouts": "Yêu cầu chi trả",
  "/admin/finance": "Tài chính / chi trả",
  "/admin/n-point-requests": "X\u1eed l\u00fd n\u1ea1p N-Point",
  "/admin/audit": "Nhật ký kiểm toán",
  "/admin/audit-log": "Nhật ký kiểm toán",
  "/admin/notifications": "Thông báo",
  "/admin/settings": "Thiết lập hệ thống"
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
