import { AppShell, PublicHeader } from "@/app/components/dcreator/layout/shell";
import { EmptyState, ErrorState, PageHeader, SectionHeader } from "@/app/components/dcreator/ui/base";

type MissionItem = {
  id: string;
  title: string;
  rewardPoints: number;
  campaign?: { title: string };
};

const nav = [
  { href: "/dashboard/creator", label: "Overview" },
  { href: "/campaigns", label: "Marketplace" },
  { href: "/me/missions", label: "My Jobs" },
  { href: "/creator", label: "Profile" }
];

async function getMissions() {
  const res = await fetch("http://localhost:3000/api/missions", { cache: "no-store" });
  if (!res.ok) {
    throw new Error("Load missions failed");
  }
  return res.json() as Promise<{ data?: MissionItem[] }>;
}

export default async function CreatorPage() {
  let data: MissionItem[] = [];
  let error = "";

  try {
    const result = await getMissions();
    data = result.data ?? [];
  } catch (e) {
    error = e instanceof Error ? e.message : "Unknown error";
  }

  return (
    <>
      <PublicHeader />
      <AppShell sidebarItems={nav}>
        <PageHeader title="Creator Opportunities" subtitle="Danh sách mission đang mở để bạn ứng tuyển và tham gia." />
        {error ? <ErrorState title="Không thể tải mission" description={error} /> : null}
        {!error && data.length === 0 ? (
          <EmptyState title="Hiện chưa có mission mở" description="Vui lòng quay lại sau hoặc khám phá các campaign mới." />
        ) : null}
        {data.length > 0 ? (
          <section className="mt-6">
            <SectionHeader title="Mission List" subtitle={`${data.length} mission khả dụng`} />
            <div className="grid gap-4 md:grid-cols-2">
              {data.map((item) => (
                <article key={item.id} className="dc-card p-4">
                  <h3 className="font-semibold text-zinc-900">{item.title}</h3>
                  <p className="mt-1 text-sm text-zinc-600">Campaign: {item.campaign?.title ?? "N/A"}</p>
                  <p className="mt-1 text-sm text-zinc-600">
                    Reward: {item.rewardPoints.toLocaleString("vi-VN")} N-Points
                  </p>
                </article>
              ))}
            </div>
          </section>
        ) : null}
      </AppShell>
    </>
  );
}
