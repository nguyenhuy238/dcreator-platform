import { AppShell, PublicHeader } from "@/app/components/dcreator/layout/shell";
import { PageHeader, SectionHeader, StatsCard, StatusBadge } from "@/app/components/dcreator/ui/base";

const nav = [
  { href: "/dashboard/brand", label: "Overview" },
  { href: "/campaigns", label: "Campaigns" },
  { href: "/brand/proofs", label: "Proof review" },
  { href: "/wallet", label: "Fund" }
];

export default function BrandDashboardPage() {
  return <><PublicHeader /><AppShell sidebarItems={nav}><PageHeader title="Brand Dashboard" subtitle="Quản lý campaign, budget prepaid và proof của creator." action={<button className="dc-btn-primary">Tạo campaign</button>} /><section className="dc-grid-dashboard"><StatsCard title="Active campaigns" value="6" /><StatsCard title="Total budget" value="480.000.000đ" /><StatsCard title="Prepaid fund" value="126.500.000đ" /><StatsCard title="Proof pending" value="14" /></section><section className="mt-8"><SectionHeader title="Campaign Management" /><div className="dc-card overflow-hidden"><table className="w-full text-left text-sm"><thead className="bg-zinc-50 text-zinc-600"><tr><th className="px-4 py-3">Campaign</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Budget</th><th className="px-4 py-3">Action</th></tr></thead><tbody><tr className="border-t border-zinc-100"><td className="px-4 py-3">FreshSkin Summer</td><td className="px-4 py-3"><StatusBadge status="active" /></td><td className="px-4 py-3">120.000.000đ</td><td className="px-4 py-3"><button className="dc-btn-secondary">Duyệt proof</button></td></tr><tr className="border-t border-zinc-100"><td className="px-4 py-3">SnackGo Campus</td><td className="px-4 py-3"><StatusBadge status="review" /></td><td className="px-4 py-3">80.000.000đ</td><td className="px-4 py-3"><button className="dc-btn-secondary">Chỉnh sửa</button></td></tr></tbody></table></div></section></AppShell></>;
}
