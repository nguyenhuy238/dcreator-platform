"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { getDateRangeByFilter, isInCurrentMonth, isWithinDateRange, timeFilterOptions, type TimeFilter } from "@/app/admin/_lib/timeFilters";
import { AdminTabs } from "@/app/admin/_components/AdminTabs";
import { AdminDeleteDialog } from "@/app/admin/_components/AdminDeleteDialog";
import { AdminPagination } from "@/app/admin/_components/AdminPagination";
import { ManagementActionMenu } from "@/app/admin/_components/ManagementActionMenu";
import { ActionToast, EmptyState, ErrorState, LoadingSkeleton, PageHeader, SectionHeader, StatusBadge } from "@/app/components/dcreator/ui/base";
import { ReviewActionDialog } from "@/app/admin/_components/ReviewActionDialog";
import {
  BrandPerformanceTable,
  PerformanceFilters,
  PerformanceSummaryCards,
  brandPerformanceSortOptions
} from "@/features/admin/performance/components";
import { calculateBrandPerformance, sortBrandPerformance, type BrandPerformanceSortKey } from "@/features/admin/performance/brandPerformance";
import type { PerformanceStatus } from "@/features/admin/performance/creatorPerformance";

type Item = {
  id: string;
  status: string;
  verificationStatus: string;
  riskFlag: boolean;
  brandName: string;
  industry: string | null;
  contactEmail: string;
  campaignCount: number;
  activeCampaigns?: number | null;
  completedCampaigns?: number | null;
  memberCount: number;
  productCount: number;
  transactionCount?: number | null;
  transactionTotal: number;
  totalRevenue?: number | null;
  creditBalance?: number | null;
  platformFeeGenerated?: number | null;
  averageCampaignPerformanceScore?: number | null;
  lastActivityDate?: string | null;
  isLocked?: boolean | null;
  account: { email: string; displayName: string };
  createdAt: string;
};
type ApiResult<T> = { success: boolean; data: T; error?: string };

const tabs = [
  { key: "", label: "Tất cả" },
  { key: "ACTIVE", label: "Đang hoạt động" },
  { key: "LOCKED", label: "Bị khóa" },
  { key: "RISK", label: "Có rủi ro" }
];

const newestLimit = 5;
const pageLimit = 20;
const viewTabs = [
  { key: "directory", label: "Danh sách nhãn hàng" },
  { key: "performance", label: "Hiệu suất nhãn hàng" }
];

function matchesBrandSearch(item: Item, query: string) {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return true;

  return [
    item.brandName,
    item.industry,
    item.contactEmail,
    item.account.email,
    item.account.displayName
  ]
    .filter(Boolean)
    .some((value) => String(value).toLowerCase().includes(normalized));
}

function matchesBrandStatus(item: Item, status: string) {
  if (!status) return true;
  if (status === "RISK") return item.riskFlag;
  return item.status.toUpperCase() === status;
}

function formatJoinedDate(value: string) {
  return new Intl.DateTimeFormat("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" }).format(new Date(value));
}

export default function AdminBrandsPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [view, setView] = useState("directory");
  const [query, setQuery] = useState("");
  const [timeFilter, setTimeFilter] = useState<TimeFilter>("ALL");
  const [performanceQuery, setPerformanceQuery] = useState("");
  const [performanceTimeFilter, setPerformanceTimeFilter] = useState<TimeFilter>("ALL");
  const [performanceStatus, setPerformanceStatus] = useState<PerformanceStatus | "all">("all");
  const [performanceSort, setPerformanceSort] = useState<BrandPerformanceSortKey>("score-desc");
  const [toast, setToast] = useState("");
  const [acting, setActing] = useState(false);
  const [action, setAction] = useState<{ type: "lock" | "unlock" | "pause-campaigns"; id: string } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Item | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/admin/brands", { cache: "no-store" });
      const body = (await res.json()) as ApiResult<Item[]>;
      if (!res.ok || !body.success) throw new Error(body.error ?? "Tải danh sách nhãn hàng thất bại");
      setItems(body.data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Tải danh sách nhãn hàng thất bại");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const dateRange = useMemo(() => getDateRangeByFilter(timeFilter), [timeFilter]);

  const newestBrands = useMemo(
    () =>
      [...items]
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, newestLimit),
    [items]
  );

  const searchAndTimeFiltered = useMemo(
    () => items.filter((item) => matchesBrandSearch(item, query) && isWithinDateRange(item.createdAt, dateRange)),
    [dateRange, items, query]
  );

  const filtered = useMemo(
    () => searchAndTimeFiltered.filter((item) => matchesBrandStatus(item, status)),
    [searchAndTimeFiltered, status]
  );

  const totalPages = useMemo(() => Math.max(1, Math.ceil(filtered.length / pageLimit)), [filtered.length]);

  const paginatedFiltered = useMemo(
    () => filtered.slice((page - 1) * pageLimit, page * pageLimit),
    [filtered, page]
  );

  useEffect(() => {
    setPage(1);
  }, [query, status, timeFilter]);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const stats = useMemo(() => {
    const activeCount = searchAndTimeFiltered.filter((item) => item.status === "active").length;
    const verifiedCount = searchAndTimeFiltered.filter((item) => item.verificationStatus === "verified").length;
    const unverifiedCount = searchAndTimeFiltered.filter((item) => item.verificationStatus === "unverified").length;
    const newThisMonthCount = items.filter((item) => matchesBrandSearch(item, query) && isInCurrentMonth(item.createdAt)).length;

    return { activeCount, newThisMonthCount, total: searchAndTimeFiltered.length, unverifiedCount, verifiedCount };
  }, [items, query, searchAndTimeFiltered]);

  const performanceDateRange = useMemo(() => getDateRangeByFilter(performanceTimeFilter), [performanceTimeFilter]);

  const performanceRows = useMemo(() => {
    const normalized = performanceQuery.trim().toLowerCase();
    const calculated = items
      .map(calculateBrandPerformance)
      .filter((item) => {
        const matchesSearch = !normalized || [item.name, item.ownerEmail].some((value) => value.toLowerCase().includes(normalized));
        const matchesStatus = performanceStatus === "all" || item.status === performanceStatus;
        const matchesTime = isWithinDateRange(item.lastActivityDate, performanceDateRange);
        return matchesSearch && matchesStatus && matchesTime;
      });

    return sortBrandPerformance(calculated, performanceSort);
  }, [items, performanceDateRange, performanceQuery, performanceSort, performanceStatus]);

  const performanceSummary = useMemo(() => {
    const averageScore = performanceRows.length > 0 ? Math.round(performanceRows.reduce((sum, item) => sum + item.score, 0) / performanceRows.length) : 0;
    const totalRevenue = performanceRows.reduce((sum, item) => sum + item.totalRevenue, 0);
    const riskyBrands = performanceRows.filter((item) => item.status === "risky").length;
    const topBrand = performanceRows[0]?.name ?? "-";

    return [
      { title: "Nhãn hàng nổi bật", value: topBrand, hint: performanceRows[0] ? `Điểm ${performanceRows[0].score}` : "Chưa có dữ liệu" },
      { title: "Điểm trung bình", value: String(averageScore), hint: `${performanceRows.length} nhãn hàng trong bộ lọc` },
      { title: "Tổng doanh thu nhãn hàng", value: `${totalRevenue.toLocaleString("vi-VN")} VNĐ` },
      { title: "Nhãn hàng rủi ro", value: String(riskyBrands), hint: "Cần theo dõi hạn mức/rủi ro" }
    ];
  }, [performanceRows]);

  return (
    <>
      <PageHeader title="Quản lý nhãn hàng" subtitle="Giám sát KYB/rủi ro, hạn mức tín dụng và trạng thái vận hành nhãn hàng (không dùng để duyệt onboarding ban đầu)." action={<button className="dc-btn-secondary" onClick={() => void load()}>Làm mới</button>} />
      <section className="dc-card p-4 grid gap-3">
        <AdminTabs items={tabs} value={status} onChange={setStatus} />
        <div className="grid gap-2 md:grid-cols-[1fr_220px_auto]">
          <input className="dc-input" placeholder="Tìm theo nhãn hàng, email hoặc ngành hàng" value={query} onChange={(e) => setQuery(e.target.value)} />
          <select className="dc-input" value={timeFilter} onChange={(e) => setTimeFilter(e.target.value as TimeFilter)}>
            {timeFilterOptions.map((option) => <option key={option.key} value={option.key}>{option.label}</option>)}
          </select>
          <button className="dc-btn-primary" onClick={() => void load()}>Lọc</button>
        </div>
      </section>
      <section className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <article className="dc-card p-4">
          <p className="text-xs uppercase tracking-wider text-zinc-500">Tổng nhãn hàng</p>
          <p className="mt-2 text-2xl font-black text-zinc-900">{stats.total}</p>
        </article>
        <article className="dc-card p-4">
          <p className="text-xs uppercase tracking-wider text-zinc-500">Đang hoạt động</p>
          <p className="mt-2 text-2xl font-black text-zinc-900">{stats.activeCount}</p>
        </article>
        <article className="dc-card p-4">
          <p className="text-xs uppercase tracking-wider text-zinc-500">Đã xác minh / Chưa xác minh</p>
          <p className="mt-2 text-2xl font-black text-zinc-900">{stats.verifiedCount} / {stats.unverifiedCount}</p>
        </article>
        <article className="dc-card p-4">
          <p className="text-xs uppercase tracking-wider text-zinc-500">Mới tháng này</p>
          <p className="mt-2 text-2xl font-black text-zinc-900">{stats.newThisMonthCount}</p>
        </article>
      </section>
      {loading ? <div className="mt-4"><LoadingSkeleton rows={4} /></div> : null}
      {error ? <div className="mt-4"><ErrorState title="Không tải được nhãn hàng" description={error} onRetry={() => void load()} /></div> : null}
      {!loading && !error ? (
        <>
          <section className="mt-6 dc-card p-4">
            <AdminTabs items={viewTabs} value={view} onChange={setView} />
          </section>
          {view === "performance" ? (
            <section className="mt-6 grid gap-4">
              <SectionHeader title="Hiệu suất nhãn hàng" subtitle="Xếp hạng hiệu quả dựa trên chiến dịch, sản phẩm, doanh thu, hạn mức tín dụng và cờ rủi ro." />
              <PerformanceSummaryCards cards={performanceSummary} />
              <PerformanceFilters
                search={performanceQuery}
                searchPlaceholder="Tìm nhãn hàng hoặc email"
                sort={performanceSort}
                sortOptions={brandPerformanceSortOptions}
                status={performanceStatus}
                timeRange={performanceTimeFilter}
                onSearchChange={setPerformanceQuery}
                onSortChange={(value) => setPerformanceSort(value as BrandPerformanceSortKey)}
                onStatusChange={(value) => setPerformanceStatus(value as PerformanceStatus | "all")}
                onTimeRangeChange={(value) => setPerformanceTimeFilter(value as TimeFilter)}
              />
              <BrandPerformanceTable items={performanceRows} />
            </section>
          ) : (
            <>
              <section className="mt-6">
                <SectionHeader title="Nhãn hàng mới tham gia" subtitle="Các nhãn hàng được tạo gần đây trong hệ thống" />
                {newestBrands.length === 0 ? <EmptyState title="Chưa có nhãn hàng mới" description="Hệ thống chưa ghi nhận nhãn hàng mới tham gia." /> : (
                  <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
                    {newestBrands.map((item) => (
                      <article key={item.id} className="dc-card p-4">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="truncate font-semibold text-zinc-900">{item.brandName}</p>
                            <p className="mt-1 truncate text-xs text-zinc-500">{item.contactEmail}</p>
                          </div>
                          <StatusBadge status={item.status} />
                        </div>
                        <p className="mt-3 text-xs text-zinc-500">{item.industry ?? "-"}</p>
                        <p className="mt-1 text-xs font-medium text-zinc-700">Tham gia {formatJoinedDate(item.createdAt)}</p>
                      </article>
                    ))}
                  </div>
                )}
              </section>
              <section className="mt-6">
                <SectionHeader title="Tất cả nhãn hàng" subtitle={`Tổng ${filtered.length} nhãn hàng`} />
                {filtered.length === 0 ? <EmptyState title="Không có dữ liệu" description="Không có nhãn hàng phù hợp bộ lọc." /> : (
                  <>
                    <div className="grid gap-3">
                      {paginatedFiltered.map((item) => (
                        <article key={item.id} className="dc-card p-4">
                          <div className="flex flex-wrap items-center justify-between gap-3">
                            <div>
                              <p className="font-semibold">{item.brandName}</p>
                              <p className="text-xs text-zinc-500">{item.industry ?? "-"} • {item.contactEmail}</p>
                              <p className="mt-1 text-xs text-zinc-500">
                                Chiến dịch: {item.campaignCount} • Thành viên: {item.memberCount} • Sản phẩm: {item.productCount} • Giao dịch: {item.transactionTotal.toLocaleString("vi-VN")} VNĐ • Tham gia: {formatJoinedDate(item.createdAt)}
                              </p>
                            </div>
                            <div className="flex flex-wrap justify-end gap-2">
                              <StatusBadge status={item.status} />
                              <StatusBadge status={item.verificationStatus} />
                              {item.riskFlag ? <StatusBadge status="risk" /> : null}
                            </div>
                          </div>
                          <div className="mt-3 flex flex-wrap gap-2">
                            <Link className="dc-btn-primary" href={`/admin/brands/${item.id}`}>Chi tiết</Link>
                            <Link className="dc-btn-secondary" href={`/admin/brands/${item.id}`}>Chỉnh sửa</Link>
                            <button className="rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-red-700" onClick={() => setDeleteTarget(item)}>Xóa</button>
                            <ManagementActionMenu
                              items={[
                                { key: "pause", label: "Tạm dừng chiến dịch" },
                                { key: "finance", label: "Điều chỉnh hạn mức" },
                                { key: "lock", label: "Khóa nhãn hàng", danger: true },
                                { key: "unlock", label: "Mở khóa nhãn hàng" }
                              ]}
                              onSelect={(key) => {
                                if (key === "finance") window.location.href = "/admin/finance";
                                if (key === "pause") setAction({ type: "pause-campaigns", id: item.id });
                                if (key === "lock") setAction({ type: "lock", id: item.id });
                                if (key === "unlock") setAction({ type: "unlock", id: item.id });
                              }}
                            />
                          </div>
                        </article>
                      ))}
                    </div>
                    <AdminPagination page={page} totalPages={totalPages} total={filtered.length} limit={pageLimit} onPageChange={setPage} />
                  </>
                )}
              </section>
            </>
          )}
        </>
      ) : null}
      {toast ? <ActionToast message={toast} /> : null}
      <AdminDeleteDialog
        open={Boolean(deleteTarget)}
        title={`Xóa nhãn hàng ${deleteTarget?.brandName ?? ""}`}
        confirmationLabel="tên nhãn hàng"
        expectedConfirmation={deleteTarget?.brandName ?? ""}
        impactUrl={`/api/admin/brands/${deleteTarget?.id ?? ""}?intent=delete-impact`}
        deleteUrl={`/api/admin/brands/${deleteTarget?.id ?? ""}`}
        onCancel={() => setDeleteTarget(null)}
        onDeleted={(message) => {
          setDeleteTarget(null);
          setToast(message);
          setTimeout(() => setToast(""), 2000);
          void load();
        }}
      />
      <ReviewActionDialog
        open={Boolean(action)}
        title={action?.type === "lock" ? "Khóa nhãn hàng" : action?.type === "unlock" ? "Mở khóa nhãn hàng" : "Tạm dừng toàn bộ chiến dịch"}
        description="Bắt buộc nhập lý do để ghi audit log."
        requireReason
        submitting={acting}
        onCancel={() => !acting && setAction(null)}
        onConfirm={async (reason) => {
          if (!action) return;
          setActing(true);
          try {
            const endpoint =
              action.type === "lock" ? "lock" : action.type === "unlock" ? "unlock" : "pause-campaigns";
            const res = await fetch(`/api/admin/brands/${action.id}/${endpoint}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ reason })
            });
            const body = await res.json();
            if (!res.ok || !body.success) throw new Error(body.error ?? "Thao tác thất bại");
            setToast("Đã cập nhật trạng thái nhãn hàng");
            setTimeout(() => setToast(""), 2000);
            setAction(null);
            await load();
          } catch (e) {
            setError(e instanceof Error ? e.message : "Thao tác thất bại");
          } finally {
            setActing(false);
          }
        }}
      />
    </>
  );
}
