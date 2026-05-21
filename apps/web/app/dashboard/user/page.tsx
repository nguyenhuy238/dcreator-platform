import { AppShell, PublicHeader } from "@/app/components/dcreator/layout/shell";
import { MissionCard, VoucherCard } from "@/app/components/dcreator/cards/campaign";
import { PageHeader, SectionHeader, StatsCard } from "@/app/components/dcreator/ui/base";

const nav = [
  { href: "/dashboard/user", label: "Tổng quan" },
  { href: "/campaigns", label: "Campaign" },
  { href: "/wallet", label: "Wallet" },
  { href: "/vouchers", label: "Voucher" }
];

export default function UserDashboardPage() {
  return <><PublicHeader /><AppShell sidebarItems={nav}><PageHeader title="User Dashboard" subtitle="Theo dõi ủng hộ, voucher, mission và số dư N-Points." action={<button className="dc-btn-primary">Khám phá campaign</button>} /><section className="dc-grid-dashboard"><StatsCard title="N-Points" value="4,820" hint="+320 tuần này" /><StatsCard title="Campaign đã ủng hộ" value="12" /><StatsCard title="Voucher đang có" value="8" /><StatsCard title="Mission tham gia" value="3" /></section><section className="mt-8"><SectionHeader title="My Vouchers" /><div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3"><VoucherCard code="DCR-NEW-2026" status="active" expiry="31/12/2026" /><VoucherCard code="DCR-MAY-150" status="used" expiry="15/05/2026" /><VoucherCard code="DCR-WEEKEND" status="expired" expiry="01/04/2026" /></div></section><section className="mt-8"><SectionHeader title="My Missions" /><div className="grid gap-4 md:grid-cols-2"><MissionCard title="Review 30s campaign FreshSkin" status="pending" reward="300 N-Points" due="25/05/2026" /><MissionCard title="Đăng story kèm voucher" status="approved" reward="500 N-Points" due="18/05/2026" /></div></section></AppShell></>;
}
