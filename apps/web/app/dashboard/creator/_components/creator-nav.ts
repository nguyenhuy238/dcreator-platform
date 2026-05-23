export type CreatorNavItem = {
  href: string;
  label: string;
  description?: string;
};

export const creatorNav = [
  { href: "/dashboard/creator", label: "Tổng quan", description: "Theo dõi KPI và tiến độ nhiệm vụ" },
  { href: "/campaigns", label: "Chiến dịch", description: "Tìm chiến dịch và nhận nhiệm vụ mới" },
  { href: "/me/mission", label: "Nhiệm vụ của tôi", description: "Quản lý nhiệm vụ đã tham gia" }
] as const satisfies readonly CreatorNavItem[];
