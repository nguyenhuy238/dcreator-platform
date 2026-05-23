import { AppShell, PublicHeader } from "@/app/components/dcreator/layout/shell";
import { BrandDashboardClient } from "@/app/dashboard/brand/_components/BrandDashboardClient";

const nav = [
  { href: "/dashboard/brand", label: "Brand Dashboard" },
  { href: "/dashboard/brand/onboarding", label: "Onboarding / BCC" },
  { href: "/dashboard/brand/products", label: "Sản phẩm & lô hàng" },
  { href: "/dashboard/brand/campaign-setup", label: "Yêu cầu campaign" },
  { href: "/dashboard/brand/profile", label: "Brand Profile" },
  { href: "/brand", label: "Chiến dịch" },
  { href: "/brand/proofs", label: "Duyệt proof" },
  { href: "/wallet", label: "Quỹ" }
];

export default function BrandDashboardPage() {
  return (
    <>
      <PublicHeader />
      <AppShell sidebarItems={nav}>
        <BrandDashboardClient />
      </AppShell>
    </>
  );
}
