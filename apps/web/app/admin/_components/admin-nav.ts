export type AdminNavItem = {
  href: string;
  label: string;
  description?: string;
  isComingSoon?: boolean;
};

export const adminNav = [
  { href: "/admin", label: "Overview", description: "System snapshot" },
  { href: "/admin/users", label: "Account Review", description: "User access and lock/unlock" },
  { href: "/admin/brands", label: "Brand Requests", description: "Brand onboarding reviews" },
  { href: "/admin/creators", label: "Creator Requests", description: "Creator onboarding reviews" },
  { href: "/admin/campaigns", label: "Campaign Review", description: "Campaign moderation" },
  { href: "/admin/campaign-applications", label: "Creator Applications", description: "Creator apply campaign queue" },
  { href: "/admin/products", label: "Product/Inventory Review", description: "Product and stock verification" },
  { href: "/admin/content-review", label: "Content Review", description: "Proof/content moderation" },
  { href: "/admin/fulfillment", label: "Fulfillment", description: "Ops shipment workflow" },
  { href: "/admin/finance", label: "Finance/Payout", description: "Finance controls and payouts" },
  { href: "/admin/payouts", label: "Payout Requests", description: "Review creator payout queue" },
  { href: "/admin/support", label: "Support", description: "Brand/Creator support queue", isComingSoon: true },
  { href: "/admin/reports", label: "Reports", description: "KPI and performance reports", isComingSoon: true },
  { href: "/admin/audit", label: "Audit Logs", description: "Admin action tracing" },
  { href: "/admin/settings", label: "Settings", description: "Admin module settings", isComingSoon: true }
] as const satisfies readonly AdminNavItem[];
