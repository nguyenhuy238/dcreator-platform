import { AppShell, PublicHeader } from "@/app/components/dcreator/layout/shell";
import { MissionCard } from "@/app/components/dcreator/cards/campaign";
import { PageHeader, SectionHeader, StatsCard } from "@/app/components/dcreator/ui/base";

const nav = [
  { href: "/dashboard/creator", label: "Overview" },
  { href: "/campaigns", label: "Marketplace" },
  { href: "/me/missions", label: "My Jobs" },
  { href: "/creator", label: "Profile" }
];

export default function CreatorDashboardPage() {
  return <><PublicHeader /><AppShell sidebarItems={nav}><PageHeader title="Creator Dashboard" subtitle="Nhận nhiệm vụ, nộp proof và theo dõi hoa hồng." action={<button className="dc-btn-primary">Nhận nhiệm vụ</button>} /><section className="dc-grid-dashboard"><StatsCard title="Total jobs" value="27" /><StatsCard title="Pending proofs" value="4" /><StatsCard title="Approved videos" value="19" /><StatsCard title="Commission earned" value="28.400.000đ" /></section><section className="mt-8"><SectionHeader title="Proof Submission" subtitle="Nộp link video và ảnh screenshot đúng brief." /><form className="dc-card grid gap-3 p-4 md:grid-cols-2"><input className="dc-input" placeholder="Video URL" /><input className="dc-input" placeholder="Screenshot URL" /><textarea className="dc-input md:col-span-2" placeholder="Ghi chú cho reviewer" rows={3} /><button className="dc-btn-primary md:col-span-2">Nộp proof</button></form></section><section className="mt-8"><SectionHeader title="My Jobs" /><div className="grid gap-4 md:grid-cols-2"><MissionCard title="TikTok short clip" status="active" reward="Fixed fee 600k" due="27/05/2026" /><MissionCard title="Livestream mention" status="rejected" reward="Commission 4%" due="20/05/2026" /></div></section></AppShell></>;
}
