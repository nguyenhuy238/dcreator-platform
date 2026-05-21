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
        <PageHeader title="Chiến dịch dành cho bạn" subtitle="Tìm chiến dịch phù hợp để ủng hộ hoặc tham gia mission." />
        <section className="dc-card mb-5 grid gap-3 p-4 md:grid-cols-[1fr_220px]">
          <input
            aria-label="Tìm chiến dịch"
            className="dc-input"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Tìm theo tên chiến dịch..."
          />
          <select aria-label="Lọc trạng thái" className="dc-input" value={status} onChange={(event) => setStatus(event.target.value)}>
            <option value="all">Tất cả trạng thái</option>
            <option value="active">Đang hoạt động</option>
            <option value="ended">Đã kết thúc</option>
            <option value="full">Đã đủ slot</option>
          </select>
        </section>

        {filtered.length === 0 ? (
          <EmptyState title="Không có chiến dịch phù hợp" description="Hãy thử thay đổi từ khóa hoặc bộ lọc trạng thái." />
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {filtered.map((item) => (
              <CampaignCard key={item.id} campaign={item} />
            ))}
          </div>
        )}
      </main>
      <PublicFooter />
    </>
  );
}
