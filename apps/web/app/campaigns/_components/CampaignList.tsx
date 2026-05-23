"use client";

import { useEffect, useMemo, useState } from "react";
import styles from "../campaigns.module.css";
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
    <section className={styles.page}>
      <CampaignFilters value={filters} onChange={onFilterChange} />

      {loading ? (
        <div className={styles.grid}>
          {Array.from({ length: 6 }).map((_, idx) => (
            <div className={styles.skeleton} key={idx} />
          ))}
        </div>
      ) : null}

      {!loading && error ? <p className={styles.error}>Không thể tải chiến dịch: {error}</p> : null}
      {!loading && !error && items.length === 0 ? <p className={styles.empty}>Không có chiến dịch phù hợp bộ lọc.</p> : null}

      {!loading && !error && items.length > 0 ? (
        <>
          <div className={styles.grid}>
            {items.map((campaign) => (
              <CampaignCard key={campaign.slug} campaign={campaign} />
            ))}
          </div>
          <div className={styles.pager}>
            <button className={styles.pagerBtn} disabled={page <= 1} onClick={() => setPage((prev) => Math.max(1, prev - 1))}>
              Trang trước
            </button>
            <span className={styles.pagerText}>
              Trang {page}/{totalPages}
            </span>
            <button className={styles.pagerBtn} disabled={page >= totalPages} onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}>
              Trang sau
            </button>
          </div>
        </>
      ) : null}
    </section>
  );
}
