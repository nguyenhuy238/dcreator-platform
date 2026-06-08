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
        description: "Command center vận hành",
        icon: "Gauge",
        priority: "high",
      },
    ],
  },
  {
    title: "NGHIỆP VỤ DCREATOR",
    items: [
      {
        href: "/admin/campaigns",
        label: "Campaign / Job",
        description: "Duyệt và vận hành campaign",
        icon: "Megaphone",
        activePrefixes: ["/admin/campaign-applications"],
      },
      {
        href: "/admin/proofs",
        label: "Mission & Proof",
        description: "Workflow proof và tranh chấp",
        icon: "ClipboardText",
        activePrefixes: ["/admin/proofs", "/admin/content-review"],
      },
      {
        href: "/admin/mission-reviews",
        label: "Duyệt nhiệm vụ Creator",
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
        href: "/admin/vouchers",
        label: "Voucher / Reward",
        description: "Giám sát phát hành và redeem",
        icon: "Gift",
      },
      {
        href: "/admin/payouts",
        label: "Payout Creator",
        description: "Duyệt và chi trả Creator",
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
        description: "Tài khoản User / Backer",
        icon: "UsersThree",
      },
      {
        href: "/admin/creators",
        label: "Creator",
        description: "Hồ sơ, xác minh, rủi ro",
        icon: "UserCircle",
        activePrefixes: [
          "/admin/creator-requests",
          "/admin/creator-applications",
        ],
      },
      {
        href: "/admin/brands",
        label: "Brand",
        description: "KYB, hạn mức, vận hành",
        icon: "Storefront",
        activePrefixes: ["/admin/brand-requests", "/admin/brand-applications"],
      },
      {
        href: "/admin/brand-consultations",
        label: "Tư vấn Brand",
        description: "Lead tư vấn từ landing page",
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
        description: "Doanh thu, lỗi thanh toán, payout",
        icon: "Wallet",
      },
      {
        href: "/admin/n-point-requests",
        label: "Giao dịch N-Points",
        description: "Nạp điểm, refund, đối soát điểm",
        icon: "Coins",
      },
      {
        href: "/admin/payment-transactions",
        label: "Payment Transactions",
        description: "Theo dõi giao dịch gateway",
        icon: "Ticket",
        disabled: true,
        isComingSoon: true,
      },
      {
        href: "/admin/refunds",
        label: "Đối soát / Refund",
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
        label: "Risk & Fraud",
        description: "Cảnh báo gian lận và lạm dụng",
        icon: "ShieldWarning",
        priority: "high",
      },
      {
        href: "/admin/audit",
        label: "Audit Log",
        description: "Nhật ký vận hành hệ thống",
        icon: "Scroll",
        activePrefixes: ["/admin/audit-log"],
      },
      {
        href: "/admin/notifications",
        label: "Notifications",
        description: "Gửi thông báo hệ thống",
        icon: "Bell",
      },
      {
        href: "/admin/settings",
        label: "System Settings",
        description: "Thiết lập vận hành",
        icon: "SlidersHorizontal",
      },
    ],
  },
];
