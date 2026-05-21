import { AppShell, PublicHeader } from "@/app/components/dcreator/layout/shell";
import { PageHeader, SectionHeader, StatsCard, StatusBadge } from "@/app/components/dcreator/ui/base";

const nav = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/proofs", label: "Proof queue" },
  { href: "/admin/vouchers", label: "Vouchers" },
  { href: "/campaigns", label: "Campaigns" }
];

export default function AdminPage() {
  return <><PublicHeader /><AppShell sidebarItems={nav}><PageHeader title="Admin/Ops Dashboard" subtitle="Giám sát review, fraud risk, payment và audit log." action={<button className="dc-btn-primary">Duyệt proof</button>} /><section className="dc-grid-dashboard"><StatsCard title="Total users" value="12,894" /><StatsCard title="Pending campaign reviews" value="18" /><StatsCard title="Pending proof reviews" value="32" /><StatsCard title="Fraud alerts" value="7" /></section><section className="mt-8"><SectionHeader title="Proof Review Queue" subtitle="Ưu tiên proof có risk score cao." /><div className="grid gap-3">{["Proof #PR-1268", "Proof #PR-1269", "Proof #PR-1270"].map((item) => <article key={item} className="dc-card flex flex-wrap items-center justify-between gap-3 p-4"><div><p className="font-semibold">{item}</p><p className="text-sm text-zinc-600">Creator: Tran N • Campaign: FreshSkin</p></div><div className="flex items-center gap-2"><StatusBadge status="pending" /><button className="dc-btn-secondary">Reject</button><button className="dc-btn-primary">Approve</button></div></article>)}</div></section></AppShell></>;
}
