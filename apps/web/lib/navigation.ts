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
  { href: "/dashboard/user", label: "Tổng quan cá nhân", description: "Tổng quan tài khoản của bạn" },
  { href: "/dashboard/user/profile", label: "Hồ sơ cá nhân", description: "Thông tin cá nhân và xác minh" },
  { href: "/dashboard/user/wallet", label: "Ví / N-Points", description: "Số dư và lịch sử giao dịch" },
  { href: "/dashboard/user/vouchers", label: "Voucher của tôi", description: "Voucher đã nhận và trạng thái" },
  { href: "/dashboard/user/campaigns", label: "Campaign đã tham gia", description: "Lịch sử ủng hộ và phần thưởng" },
  { href: "/dashboard/user/missions", label: "Nhiệm vụ của tôi", description: "Nhiệm vụ user và proof đã nộp" },
  { href: "/dashboard/user/role-requests", label: "Đăng ký nâng cấp vai trò", description: "Đăng ký Creator/Brand" },
  { href: "/dashboard/user/settings", label: "Cài đặt tài khoản", description: "Mật khẩu, thông báo, đăng xuất" }
];

const creatorNavItems: readonly NavItem[] = [
  { href: "/dashboard/creator", label: "Tổng quan Creator", description: "KPI và tiến độ Creator" },
  { href: "/dashboard/creator/jobs", label: "Campaign / Job", description: "Chiến dịch có thể tham gia" },
  { href: "/dashboard/creator/missions", label: "Nhiệm vụ của tôi", description: "Danh sách nhiệm vụ Creator" },
  { href: "/dashboard/creator/channels", label: "Kênh mạng xã hội", description: "Quản lý social channels" },
  { href: "/dashboard/creator/profile", label: "Hồ sơ Creator", description: "Portfolio và thông tin Creator" },
  { href: "/dashboard/creator/wallet", label: "Ví Creator", description: "Hoa hồng và payout" },
  { href: "/dashboard/creator/analytics", label: "KPI / Analytics", description: "Hiệu suất nội dung" }
];

const brandNavItems: readonly NavItem[] = [
  { href: "/dashboard/brand", label: "Tổng quan Brand", description: "Toàn cảnh vận hành Brand" },
  { href: "/dashboard/brand/onboarding", label: "Onboarding / BCC", description: "Hồ sơ pháp lý và BCC" },
  { href: "/dashboard/brand/profile", label: "Hồ sơ nhãn hàng", description: "Thông tin nhãn hàng" },
  { href: "/dashboard/brand/campaigns", label: "Campaign / Job", description: "Tạo và quản lý campaign" },
  { href: "/dashboard/brand/applications", label: "Creator ứng tuyển", description: "Đơn ứng tuyển từ Creator" },
  { href: "/dashboard/brand/mission-reviews", label: "Duyệt nhiệm vụ Creator", description: "Duyệt kịch bản, nhận nhiệm vụ, video và hoàn thành" },
  { href: "/dashboard/brand/mission-history", label: "Lịch sử nhiệm vụ", description: "Toàn bộ Creator Mission theo campaign của Brand" },
  { href: "/dashboard/brand/proofs", label: "Duyệt proof / video", description: "Duyệt nội dung nộp lên" },
  { href: "/dashboard/brand/analytics", label: "KPI / Analytics", description: "Phân tích hiệu quả campaign" },
  { href: "/dashboard/brand/wallet", label: "Quỹ Brand", description: "Quỹ prepaid và giao dịch" },
  { href: "/dashboard/brand/members", label: "Thành viên Brand", description: "Quản lý team nhãn hàng" },
  { href: "/dashboard/brand/settings", label: "Cài đặt Brand", description: "Thiết lập vận hành Brand" }
];

const adminNavItems: readonly NavItem[] = [
  { href: "/admin", label: "Tổng quan Admin", description: "Toàn cảnh hệ thống" },
  { href: "/admin/users", label: "Người dùng", description: "Quản lý tài khoản người dùng" },
  { href: "/admin/creator-requests", label: "Quản lý Creator", description: "Quản lý hồ sơ Creator và quyết định duyệt" },
  { href: "/admin/brand-requests", label: "Quản lý Brand", description: "Quản lý hồ sơ Brand và quyết định duyệt" },
  { href: "/admin/campaigns", label: "Quản lý campaign", description: "Quản lý campaign/job và quy trình duyệt" },
  { href: "/admin/mission-reviews", label: "Quản lý nhiệm vụ Creator", description: "Quản lý kịch bản, nhận nhiệm vụ, video và hoàn thành" },
  { href: "/admin/mission-history", label: "Lịch sử nhiệm vụ", description: "Toàn bộ lịch sử Creator Mission trong hệ thống" },
  { href: "/admin/finance", label: "Finance / payout", description: "Tài chính và chi trả" },
  { href: "/admin/audit", label: "Audit log", description: "Nhật ký vận hành hệ thống" },
  { href: "/admin/notifications", label: "Notification", description: "Thông báo hệ thống" },
  { href: "/admin/settings", label: "System settings", description: "Thiết lập hệ thống" }
];

const WORKSPACES: readonly WorkspaceConfig[] = [
  {
    id: "user",
    label: "Tài khoản cá nhân",
    title: "Tài khoản cá nhân",
    description: "Quản lý hồ sơ cá nhân, ví, voucher và nhiệm vụ của bạn",
    defaultHref: "/dashboard/user",
    routePrefixes: ["/dashboard/user"],
    allowedRoles: ["USER", "CREATOR", "BRAND_OWNER", "BRAND_STAFF", "ADMIN", "OPS"],
    navItems: userNavItems
  },
  {
    id: "creator",
    label: "Bảng điều khiển Creator",
    title: "Bảng điều khiển Creator",
    description: "Quản lý job, nhiệm vụ và hoa hồng",
    defaultHref: "/dashboard/creator",
    routePrefixes: ["/dashboard/creator"],
    allowedRoles: ["CREATOR"],
    navItems: creatorNavItems
  },
  {
    id: "brand",
    label: "Bảng điều khiển Nhãn hàng",
    title: "Bảng điều khiển Nhãn hàng",
    description: "Quản lý onboarding, campaign, creator và quỹ Brand",
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
  "/dashboard/user": "Dashboard cá nhân",
  "/dashboard/user/profile": "Hồ sơ cá nhân",
  "/dashboard/user/wallet": "Ví / N-Points",
  "/dashboard/user/vouchers": "Voucher của tôi",
  "/dashboard/user/campaigns": "Campaign đã tham gia",
  "/dashboard/user/missions": "Nhiệm vụ của tôi",
  "/dashboard/user/role-requests": "Đăng ký nâng cấp vai trò",
  "/dashboard/user/settings": "Cài đặt tài khoản",
  "/dashboard/creator": "Creator Dashboard",
  "/dashboard/creator/jobs": "Campaign / Job",
  "/dashboard/creator/missions": "Nhiệm vụ của tôi",
  "/dashboard/creator/channels": "Kênh mạng xã hội",
  "/dashboard/creator/profile": "Hồ sơ Creator",
  "/dashboard/creator/wallet": "Ví Creator",
  "/dashboard/creator/analytics": "KPI / Analytics",
  "/dashboard/brand": "Brand Dashboard",
  "/dashboard/brand/onboarding": "Onboarding / BCC",
  "/dashboard/brand/profile": "Hồ sơ nhãn hàng",
  "/dashboard/brand/campaigns": "Campaign / Job",
  "/dashboard/brand/applications": "Creator ứng tuyển",
  "/dashboard/brand/mission-reviews": "Duyệt nhiệm vụ Creator",
  "/dashboard/brand/mission-history": "Lịch sử nhiệm vụ",
  "/dashboard/brand/proofs": "Duyệt proof / video",
  "/dashboard/brand/analytics": "KPI / Analytics",
  "/dashboard/brand/wallet": "Quỹ Brand",
  "/dashboard/brand/members": "Thành viên Brand",
  "/dashboard/brand/settings": "Cài đặt Brand",
  "/admin": "Admin",
  "/admin/users": "Người dùng",
  "/admin/creator-requests": "Quản lý Creator",
  "/admin/brand-requests": "Quản lý Brand",
  "/admin/campaigns": "Quản lý campaign",
  "/admin/mission-reviews": "Quản lý nhiệm vụ Creator",
  "/admin/mission-history": "Lịch sử nhiệm vụ",
  "/admin/proofs": "Duyệt video",
  "/admin/mission-applications": "Duyệt nhận nhiệm vụ",
  "/admin/mission-video-reviews": "Duyệt video",
  "/admin/mission-final-reviews": "Duyệt hoàn thành",
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

