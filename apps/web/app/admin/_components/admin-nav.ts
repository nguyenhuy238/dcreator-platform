export type AdminNavItem = {
  href: string;
  label: string;
  description?: string;
  icon?: string;
  activePrefixes?: readonly string[];
  badge?: number;
  priority?: "critical" | "high" | "normal";
  disabled?: boolean;
  isComingSoon?: boolean;
};

export type AdminNavGroup = {
  title: string;
  items: readonly AdminNavItem[];
};

export const adminNav: readonly AdminNavGroup[] = [
  {
    title: "VẬN HÀNH",
    items: [
      {
        href: "/admin",
        label: "Tổng quan Admin",
        description: "Trung tâm vận hành",
        icon: "Gauge",
        priority: "high",
      },
      {
        href: "/admin/analytics",
        label: "Phân tích hệ thống",
        description: "Chỉ số tăng trưởng, bằng chứng, doanh thu",
        icon: "ClipboardText",
      },
    ],
  },
  {
    title: "NGHIỆP VỤ DCREATOR",
    items: [
      {
        href: "/admin/campaigns",
        label: "Chiến dịch / Nhiệm vụ",
        description: "Duyệt và vận hành chiến dịch",
        icon: "Megaphone",
        activePrefixes: ["/admin/campaign-applications"],
      },
      {
        href: "/admin/mission-reviews",
        label: "Duyệt nhiệm vụ nhà sáng tạo",
        description: "Nhận nhiệm vụ, video, hoàn thành",
        icon: "ListChecks",
        activePrefixes: [
          "/admin/mission-reviews",
          "/admin/mission-history",
          "/admin/mission-applications",
          "/admin/mission-video-reviews",
          "/admin/mission-final-reviews",
          "/admin/creator-missions",
        ],
      },
      {
        href: "/admin/payouts",
        label: "Chi trả nhà sáng tạo",
        description: "Duyệt và chi trả nhà sáng tạo",
        icon: "Bank",
      },
    ],
  },
  {
    title: "ĐỐI TƯỢNG",
    items: [
      {
        href: "/admin/users",
        label: "Người dùng",
        description: "Tài khoản người dùng",
        icon: "UsersThree",
      },
      {
        href: "/admin/creators",
        label: "Nhà sáng tạo",
        description: "Hồ sơ, xác minh, rủi ro",
        icon: "UserCircle",
        activePrefixes: [
          "/admin/creator-requests",
          "/admin/creator-applications",
        ],
      },
      {
        href: "/admin/brands",
        label: "Nhãn hàng",
        description: "KYB, hạn mức, vận hành",
        icon: "Storefront",
        activePrefixes: ["/admin/brand-requests", "/admin/brand-applications"],
      },
      {
        href: "/admin/brand-consultations",
        label: "Tư vấn nhãn hàng",
        description: "Khách hàng tiềm năng từ trang giới thiệu",
        icon: "IdentificationCard",
      },
    ],
  },
  {
    title: "TÀI CHÍNH",
    items: [
      {
        href: "/admin/finance",
        label: "Tổng quan tài chính",
        description: "Doanh thu, lỗi thanh toán, chi trả",
        icon: "Wallet",
      },
      {
        href: "/admin/n-point-requests",
        label: "Giao dịch N-Points",
        description: "Nạp điểm, hoàn tiền, đối soát điểm",
        icon: "Coins",
      },
      {
        href: "/admin/payment-transactions",
        label: "Giao dịch thanh toán",
        description: "Theo dõi giao dịch cổng thanh toán",
        icon: "Ticket",
        disabled: true,
        isComingSoon: true,
      },
      {
        href: "/admin/refunds",
        label: "Đối soát / Hoàn tiền",
        description: "Hoàn tiền và đối soát ví",
        icon: "Scroll",
        disabled: true,
        isComingSoon: true,
      },
    ],
  },
  {
    title: "KIỂM SOÁT HỆ THỐNG",
    items: [
      {
        href: "/admin/risk",
        label: "Rủi ro và gian lận",
        description: "Cảnh báo gian lận và lạm dụng",
        icon: "ShieldWarning",
        priority: "high",
      },
      {
        href: "/admin/audit",
        label: "Nhật ký kiểm toán",
        description: "Nhật ký vận hành hệ thống",
        icon: "Scroll",
        activePrefixes: ["/admin/audit-log"],
      },
      {
        href: "/admin/notifications",
        label: "Thông báo",
        description: "Gửi thông báo hệ thống",
        icon: "Bell",
      },
      {
        href: "/admin/settings",
        label: "Thiết lập hệ thống",
        description: "Thiết lập vận hành",
        icon: "SlidersHorizontal",
      },
    ],
  },
];
