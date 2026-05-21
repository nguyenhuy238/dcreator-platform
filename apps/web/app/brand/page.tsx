import { AppShell, PublicHeader } from "@/app/components/dcreator/layout/shell";
import { EmptyState, ErrorState, PageHeader, SectionHeader, StatusBadge } from "@/app/components/dcreator/ui/base";

type CampaignItem = {
  id: string;
  title: string;
  status: string;
  brand?: { displayName: string };
};

const nav = [
  { href: "/dashboard/brand", label: "Overview" },
  { href: "/campaigns", label: "Campaigns" },
  { href: "/brand/proofs", label: "Proof review" },
  { href: "/wallet", label: "Fund" }
];

async function getCampaigns() {
  const res = await fetch("http://localhost:3000/api/campaigns?limit=10", { cache: "no-store" });
  if (!res.ok) {
    throw new Error("Load campaigns failed");
  }
  return res.json() as Promise<{ data?: CampaignItem[] }>;
}

export default async function BrandPage() {
  let data: CampaignItem[] = [];
  let error = "";

  try {
    const result = await getCampaigns();
    data = result.data ?? [];
  } catch (e) {
    error = e instanceof Error ? e.message : "Unknown error";
  }

  return (
    <>
      <PublicHeader />
      <AppShell sidebarItems={nav}>
        <PageHeader title="Brand Campaigns" subtitle="Theo dõi danh sách campaign và trạng thái vận hành." />
        {error ? <ErrorState title="Không thể tải campaign" description={error} /> : null}
        {!error && data.length === 0 ? (
          <EmptyState title="Chưa có campaign" description="Tạo campaign đầu tiên để bắt đầu thu hút creator." />
        ) : null}
        {data.length > 0 ? (
          <section className="mt-6">
            <SectionHeader title="Campaign List" subtitle={`${data.length} campaign`} />
            <div className="grid gap-4 md:grid-cols-2">
              {data.map((item) => (
                <article key={item.id} className="dc-card p-4">
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="font-semibold text-zinc-900">{item.title}</h3>
                    <StatusBadge status={item.status.toLowerCase()} />
                  </div>
                  <p className="mt-2 text-sm text-zinc-600">Brand: {item.brand?.displayName ?? "N/A"}</p>
                </article>
              ))}
            </div>
          </section>
        ) : null}
      </AppShell>
    </>
  );
}
