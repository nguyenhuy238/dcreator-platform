export type AdminNavItem = {
  href: string;
  label: string;
  description?: string;
  isComingSoon?: boolean;
};

export const adminNav = [
  { href: "/admin", label: "Tổng quan", description: "Toàn cảnh hệ thống" },
  { href: "/admin/users", label: "Duyệt tài khoản", description: "Quản lý truy cập và khóa/mở khóa" },
  { href: "/admin/brands", label: "Yêu cầu Brand", description: "Duyệt onboarding Brand" },
  { href: "/admin/creators", label: "Yêu cầu Creator", description: "Duyệt onboarding Creator" },
  { href: "/admin/campaigns", label: "Duyệt chiến dịch", description: "Kiểm duyệt chiến dịch" },
  { href: "/admin/campaign-applications", label: "Đơn ứng tuyển chiến dịch", description: "Hàng đợi ứng tuyển của Creator" },
  { href: "/admin/products", label: "Duyệt sản phẩm/tồn kho", description: "Xác minh sản phẩm và tồn kho" },
  { href: "/admin/content-review", label: "Duyệt nội dung", description: "Kiểm duyệt minh chứng/nội dung" },
  { href: "/admin/fulfillment", label: "Xử lý giao nhận", description: "Quy trình vận hành giao hàng" },
  { href: "/admin/finance", label: "Tài chính/Rút thưởng", description: "Kiểm soát tài chính và chi trả" },
  { href: "/admin/payouts", label: "Yêu cầu rút thưởng", description: "Duyệt hàng đợi rút thưởng Creator" },
  { href: "/admin/support", label: "Hỗ trợ", description: "Hàng đợi hỗ trợ Brand/Creator" },
  { href: "/admin/reports", label: "Báo cáo", description: "Báo cáo KPI và hiệu suất" },
  { href: "/admin/analytics", label: "Phân tích", description: "Tổng quan xu hướng và phân tích" },
  { href: "/admin/audit", label: "Nhật ký kiểm toán", description: "Theo dõi thao tác quản trị" },
  { href: "/admin/settings", label: "Cài đặt", description: "Cấu hình mô-đun quản trị", isComingSoon: true }
] as const satisfies readonly AdminNavItem[];
