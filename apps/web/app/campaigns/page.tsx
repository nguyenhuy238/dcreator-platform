"use client";

import { useMemo, useState } from "react";
import { CampaignCard } from "@/app/components/dcreator/cards/campaign";
import { mockCampaigns } from "@/app/components/dcreator/data/mock";
import { PublicFooter, PublicHeader } from "@/app/components/dcreator/layout/shell";
import { EmptyState, PageHeader } from "@/app/components/dcreator/ui/base";

export default function CampaignsPage() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");

  const filtered = useMemo(() => {
    return mockCampaigns.filter((item) => {
      const matchSearch = item.title.toLowerCase().includes(search.toLowerCase());
      const matchStatus = status === "all" ? true : item.status === status;
      return matchSearch && matchStatus;
    });
  }, [search, status]);

  return (
    <>
      <PublicHeader />
      <main className="mx-auto w-full max-w-7xl px-4 pb-16 pt-6 md:px-6">
        <PageHeader title="Campaign Marketplace" subtitle="Tìm campaign phù hợp để ủng hộ, nhận reward hoặc tham gia mission." />
        <section className="dc-card mb-5 grid gap-3 p-4 md:grid-cols-[1fr_220px]">
          <input aria-label="Tìm campaign" className="dc-input" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Tìm theo tên campaign..." />
          <select aria-label="Lọc trạng thái" className="dc-input" value={status} onChange={(event) => setStatus(event.target.value)}>
            <option value="all">Tất cả trạng thái</option>
            <option value="active">Active</option>
            <option value="ended">Ended</option>
            <option value="full">Full</option>
          </select>
        </section>

        {filtered.length === 0 ? <EmptyState title="Không có campaign phù hợp" description="Hãy thử thay đổi từ khóa hoặc bộ lọc trạng thái." /> : <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{filtered.map((item) => <CampaignCard key={item.id} campaign={item} />)}</div>}
      </main>
      <PublicFooter />
    </>
  );
}
