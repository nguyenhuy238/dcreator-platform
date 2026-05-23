export type AdminNavItem = {
  href: string;
  label: string;
  description?: string;
  isComingSoon?: boolean;
};

export const adminNav = [
  { href: "/admin", label: "Overview", description: "System snapshot" },
  { href: "/admin/users", label: "Account Review", description: "User access and lock/unlock" },
  { href: "/admin/brand-applications", label: "Brand Requests", description: "Brand onboarding reviews" },
  { href: "/admin/creator-applications", label: "Creator Requests", description: "Creator onboarding reviews" },
  { href: "/admin/campaigns", label: "Campaign Review", description: "Campaign moderation" },
  { href: "/admin/creator-applications", label: "Creator Applications", description: "Creator application queue" },
  { href: "/admin/product-inventory", label: "Product/Inventory Review", description: "Product and stock verification", isComingSoon: true },
  { href: "/admin/proofs", label: "Content Review", description: "Proof/content moderation" },
  { href: "/admin/fulfillment", label: "Fulfillment", description: "Ops shipment workflow", isComingSoon: true },
  { href: "/admin/finance", label: "Finance/Payout", description: "Finance controls and payouts" },
  { href: "/admin/support", label: "Support", description: "Brand/Creator support queue", isComingSoon: true },
  { href: "/admin/reports", label: "Reports", description: "KPI and performance reports", isComingSoon: true },
  { href: "/admin/audit", label: "Audit Logs", description: "Admin action tracing" },
  { href: "/admin/settings", label: "Settings", description: "Admin module settings", isComingSoon: true }
] as const satisfies readonly AdminNavItem[];
