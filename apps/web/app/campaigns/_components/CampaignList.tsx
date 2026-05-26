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
  category: "",
  status: "ACTIVE",
  rewardAvailable: false,
  sort: "trending"
};

export function CampaignList({ excludeSlugs = [] }: { excludeSlugs?: string[] }) {
  const [filters, setFilters] = useState<CampaignFilterState>(defaultFilters);
  const [page, setPage] = useState(1);
  const [items, setItems] = useState<CampaignCardData[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState(filters.search);
  const excludedSlugSet = useMemo(() => new Set(excludeSlugs), [excludeSlugs]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(filters.search);
    }, 300);
    return () => clearTimeout(timer);
  }, [filters.search]);

  const queryString = useMemo(() => {
    const query = new URLSearchParams();
    if (debouncedSearch) query.set("search", debouncedSearch);
    if (filters.category) query.set("category", filters.category);
    if (filters.status) query.set("status", filters.status);
    if (filters.rewardAvailable) query.set("rewardAvailable", "true");
    query.set("sort", filters.sort);
    query.set("page", String(page));
    query.set("limit", "12");
    return query.toString();
  }, [filters.category, filters.status, filters.rewardAvailable, filters.sort, debouncedSearch, page]);

  useEffect(() => {
    const controller = new AbortController();
    let mounted = true;
    setLoading(true);
    setError("");

    fetch(`/api/campaigns?${queryString}`, { signal: controller.signal })
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
        if (err instanceof Error && err.name === "AbortError") return;
        if (!mounted) return;
        setError(err instanceof Error ? err.message : "Lỗi không xác định");
      })
      .finally(() => {
        if (!mounted) return;
        setLoading(false);
      });

    return () => {
      mounted = false;
      controller.abort();
    };
  }, [queryString]);

  function onFilterChange(next: CampaignFilterState) {
    setFilters(next);
    setPage(1);
  }

  const visibleItems = useMemo(
    () => items.filter((campaign) => !excludedSlugSet.has(campaign.slug)),
    [items, excludedSlugSet]
  );

  return (
    <section className="grid gap-4">
      <CampaignFilters value={filters} onChange={onFilterChange} />

      {loading ? (
        <LoadingSkeleton rows={6} />
      ) : null}

      {!loading && error ? <ErrorState title="Không thể tải chiến dịch" description={error} /> : null}
      {!loading && !error && visibleItems.length === 0 ? <EmptyState title="Chưa có chiến dịch phù hợp" description="Thử đổi bộ lọc hoặc đổi từ khóa tìm kiếm." /> : null}

      {!loading && !error && visibleItems.length > 0 ? (
        <>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {visibleItems.map((campaign) => (
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
