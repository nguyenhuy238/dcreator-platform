"use client";

import { useEffect, useMemo, useState } from "react";
import { EmptyState, ErrorState, LoadingSkeleton } from "@/app/components/dcreator/ui/base";
import { CampaignCard, type CampaignCardData } from "./CampaignCard";
import { CampaignFilters, type CampaignFilterState } from "./CampaignFilters";

type CampaignListResponse = {
  success: true;
  data: {
    items: CampaignCardData[];
    pagination: { page: number; limit: number; total: number; totalPages: number };
  };
};

const defaultFilters: CampaignFilterState = {
  search: "",
  type: "",
  category: "",
  status: "ACTIVE",
  rewardAvailable: false,
  sort: "trending"
};

export function CampaignList() {
  const [filters, setFilters] = useState<CampaignFilterState>(defaultFilters);
  const [page, setPage] = useState(1);
  const [items, setItems] = useState<CampaignCardData[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const queryString = useMemo(() => {
    const query = new URLSearchParams();
    if (filters.search) query.set("search", filters.search);
    if (filters.type) query.set("type", filters.type);
    if (filters.category) query.set("category", filters.category);
    if (filters.status) query.set("status", filters.status);
    if (filters.rewardAvailable) query.set("rewardAvailable", "true");
    query.set("sort", filters.sort);
    query.set("page", String(page));
    query.set("limit", "12");
    return query.toString();
  }, [filters, page]);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setError("");

    fetch(`/api/campaigns?${queryString}`)
      .then(async (res) => {
        const payload = (await res.json()) as CampaignListResponse;
        if (!res.ok || !payload.success) {
          throw new Error("Không thể tải campaigns");
        }
        if (!mounted) return;
        setItems(payload.data.items);
        setTotalPages(payload.data.pagination.totalPages);
      })
      .catch((err: unknown) => {
        if (!mounted) return;
        setError(err instanceof Error ? err.message : "Lỗi không xác định");
      })
      .finally(() => {
        if (!mounted) return;
        setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [queryString]);

  function onFilterChange(next: CampaignFilterState) {
    setFilters(next);
    setPage(1);
  }

  return (
    <section className="grid gap-4">
      <CampaignFilters value={filters} onChange={onFilterChange} />

      {loading ? (
        <LoadingSkeleton rows={6} />
      ) : null}

      {!loading && error ? <ErrorState title="Không thể tải chiến dịch" description={error} /> : null}
      {!loading && !error && items.length === 0 ? <EmptyState title="Chưa có chiến dịch phù hợp" description="Thử nới bộ lọc hoặc đổi từ khóa tìm kiếm." /> : null}

      {!loading && !error && items.length > 0 ? (
        <>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {items.map((campaign) => (
              <CampaignCard key={campaign.slug} campaign={campaign} />
            ))}
          </div>
          <div className="flex items-center justify-between gap-3 rounded-2xl border border-zinc-200 bg-white p-3">
            <button className="dc-btn-secondary" disabled={page <= 1} onClick={() => setPage((prev) => Math.max(1, prev - 1))}>
              Trang trước
            </button>
            <span className="text-sm text-zinc-600">
              Trang {page}/{totalPages}
            </span>
            <button className="dc-btn-secondary" disabled={page >= totalPages} onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}>
              Trang sau
            </button>
          </div>
        </>
      ) : null}
    </section>
  );
}
