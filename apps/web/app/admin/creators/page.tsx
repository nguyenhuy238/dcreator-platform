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
  CreatorPerformanceTable,
  PerformanceFilters,
  PerformanceSummaryCards,
  creatorPerformanceSortOptions
} from "@/features/admin/performance/components";
import { calculateCreatorPerformance, sortCreatorPerformance, type CreatorPerformanceSortKey, type PerformanceStatus } from "@/features/admin/performance/creatorPerformance";

type Item = {
  id: string;
  status: string;
  verificationStatus: string;
  riskFlag: boolean;
  displayName: string;
  handle?: string | null;
  mainPlatform: string;
  socialUrl: string;
  contentCategory: string | null;
  campaignCount: number;
  completedCampaigns?: number | null;
  missionSubmitted?: number | null;
  missionApproved?: number | null;
  payoutCount: number;
  totalPayout?: number | null;
  transactionTotal: number;
  totalRevenueGenerated?: number | null;
  averageCampaignPerformanceScore?: number | null;
  lastActivityDate?: string | null;
  channelCount: number;
  account: { email: string; displayName: string };
  createdAt: string;
};
type ApiResult<T> = { success: boolean; data: T; error?: string };

const tabs = [
  { key: "", label: "Tất cả" },
  { key: "ACTIVE", label: "Đang hoạt động" },
  { key: "SUSPENDED", label: "Tạm khóa" },
  { key: "RISK", label: "Có rủi ro" }
];

const newestLimit = 5;
const pageLimit = 20;
const viewTabs = [
  { key: "directory", label: "Danh sách nhà sáng tạo" },
  { key: "performance", label: "Hiệu suất nhà sáng tạo" }
];

function matchesCreatorSearch(item: Item, query: string) {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return true;

  return [
    item.displayName,
    item.mainPlatform,
    item.socialUrl,
    item.contentCategory,
    item.account.email,
    item.account.displayName
  ]
    .filter(Boolean)
    .some((value) => String(value).toLowerCase().includes(normalized));
}

function matchesCreatorStatus(item: Item, status: string) {
  if (!status) return true;
  if (status === "RISK") return item.riskFlag;
  return item.status.toUpperCase() === status;
}

function formatJoinedDate(value: string) {
  return new Intl.DateTimeFormat("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" }).format(new Date(value));
}

export default function AdminCreatorsPage() {
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
  const [performanceSort, setPerformanceSort] = useState<CreatorPerformanceSortKey>("score-desc");
  const [toast, setToast] = useState("");
  const [acting, setActing] = useState(false);
  const [action, setAction] = useState<{ type: "suspend" | "unsuspend"; id: string } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Item | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/admin/creators", { cache: "no-store" });
      const body = (await res.json()) as ApiResult<Item[]>;
      if (!res.ok || !body.success) throw new Error(body.error ?? "Tải danh sách nhà sáng tạo thất bại");
      setItems(body.data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Tải danh sách nhà sáng tạo thất bại");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const dateRange = useMemo(() => getDateRangeByFilter(timeFilter), [timeFilter]);

  const newestCreators = useMemo(
    () =>
      [...items]
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, newestLimit),
    [items]
  );

  const searchAndTimeFiltered = useMemo(
    () => items.filter((item) => matchesCreatorSearch(item, query) && isWithinDateRange(item.createdAt, dateRange)),
    [dateRange, items, query]
  );

  const filtered = useMemo(
    () => searchAndTimeFiltered.filter((item) => matchesCreatorStatus(item, status)),
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
    const pendingCount = searchAndTimeFiltered.filter((item) => item.verificationStatus === "pending").length;
    const newThisMonthCount = items.filter((item) => matchesCreatorSearch(item, query) && isInCurrentMonth(item.createdAt)).length;

    return { activeCount, newThisMonthCount, pendingCount, total: searchAndTimeFiltered.length, verifiedCount };
  }, [items, query, searchAndTimeFiltered]);

  const performanceDateRange = useMemo(() => getDateRangeByFilter(performanceTimeFilter), [performanceTimeFilter]);

  const performanceRows = useMemo(() => {
    const normalized = performanceQuery.trim().toLowerCase();
    const calculated = items
      .map(calculateCreatorPerformance)
      .filter((item) => {
        const matchesSearch = !normalized || [item.name, item.contact, item.socialHandle].some((value) => value.toLowerCase().includes(normalized));
        const matchesStatus = performanceStatus === "all" || item.status === performanceStatus;
        const matchesTime = isWithinDateRange(item.lastActivityDate, performanceDateRange);
        return matchesSearch && matchesStatus && matchesTime;
      });

    return sortCreatorPerformance(calculated, performanceSort);
  }, [items, performanceDateRange, performanceQuery, performanceSort, performanceStatus]);

  const performanceSummary = useMemo(() => {
    const averageScore = performanceRows.length > 0 ? Math.round(performanceRows.reduce((sum, item) => sum + item.score, 0) / performanceRows.length) : 0;
    const totalRevenue = performanceRows.reduce((sum, item) => sum + item.totalRevenueGenerated, 0);
    const riskyCreators = performanceRows.filter((item) => item.status === "risky").length;
    const topCreator = performanceRows[0]?.name ?? "-";

    return [
      { title: "Nhà sáng tạo nổi bật", value: topCreator, hint: performanceRows[0] ? `Điểm ${performanceRows[0].score}` : "Chưa có dữ liệu" },
      { title: "Điểm trung bình", value: String(averageScore), hint: `${performanceRows.length} nhà sáng tạo trong bộ lọc` },
      { title: "Tổng doanh thu tạo ra", value: `${totalRevenue.toLocaleString("vi-VN")} VNĐ` },
      { title: "Nhà sáng tạo rủi ro", value: String(riskyCreators), hint: "Cần theo dõi thêm" }
    ];
  }, [performanceRows]);

  return (
    <>
      <PageHeader title="Quản lý nhà sáng tạo" subtitle="Giám sát rủi ro, kiểm duyệt và trạng thái vận hành nhà sáng tạo (không dùng để duyệt onboarding ban đầu)." action={<button className="dc-btn-secondary" onClick={() => void load()}>Làm mới</button>} />
      <section className="dc-card p-4 grid gap-3">
        <AdminTabs items={tabs} value={status} onChange={setStatus} />
        <div className="grid gap-2 md:grid-cols-[1fr_220px_auto]">
          <input className="dc-input" placeholder="Tìm theo tên, email hoặc kênh mạng xã hội" value={query} onChange={(e) => setQuery(e.target.value)} />
          <select className="dc-input" value={timeFilter} onChange={(e) => setTimeFilter(e.target.value as TimeFilter)}>
            {timeFilterOptions.map((option) => <option key={option.key} value={option.key}>{option.label}</option>)}
          </select>
          <button className="dc-btn-primary" onClick={() => void load()}>Lọc</button>
        </div>
      </section>
      <section className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <article className="dc-card p-4">
          <p className="text-xs uppercase tracking-wider text-zinc-500">Tổng nhà sáng tạo</p>
          <p className="mt-2 text-2xl font-black text-zinc-900">{stats.total}</p>
        </article>
        <article className="dc-card p-4">
          <p className="text-xs uppercase tracking-wider text-zinc-500">Đang hoạt động</p>
          <p className="mt-2 text-2xl font-black text-zinc-900">{stats.activeCount}</p>
        </article>
        <article className="dc-card p-4">
          <p className="text-xs uppercase tracking-wider text-zinc-500">Đã xác minh / Chờ duyệt</p>
          <p className="mt-2 text-2xl font-black text-zinc-900">{stats.verifiedCount} / {stats.pendingCount}</p>
        </article>
        <article className="dc-card p-4">
          <p className="text-xs uppercase tracking-wider text-zinc-500">Mới tháng này</p>
          <p className="mt-2 text-2xl font-black text-zinc-900">{stats.newThisMonthCount}</p>
        </article>
      </section>
      {loading ? <div className="mt-4"><LoadingSkeleton rows={4} /></div> : null}
      {error ? <div className="mt-4"><ErrorState title="Không tải được nhà sáng tạo" description={error} onRetry={() => void load()} /></div> : null}
      {!loading && !error ? (
        <>
          <section className="mt-6 dc-card p-4">
            <AdminTabs items={viewTabs} value={view} onChange={setView} />
          </section>
          {view === "performance" ? (
            <section className="mt-6 grid gap-4">
              <SectionHeader title="Hiệu suất nhà sáng tạo" subtitle="Xếp hạng hiệu quả dựa trên chiến dịch, nhiệm vụ, doanh thu, chi trả và cờ rủi ro." />
              <PerformanceSummaryCards cards={performanceSummary} />
              <PerformanceFilters
                search={performanceQuery}
                searchPlaceholder="Tìm nhà sáng tạo, email hoặc kênh"
                sort={performanceSort}
                sortOptions={creatorPerformanceSortOptions}
                status={performanceStatus}
                timeRange={performanceTimeFilter}
                onSearchChange={setPerformanceQuery}
                onSortChange={(value) => setPerformanceSort(value as CreatorPerformanceSortKey)}
                onStatusChange={(value) => setPerformanceStatus(value as PerformanceStatus | "all")}
                onTimeRangeChange={(value) => setPerformanceTimeFilter(value as TimeFilter)}
              />
              <CreatorPerformanceTable items={performanceRows} />
            </section>
          ) : (
            <>
              <section className="mt-6">
                <SectionHeader title="Nhà sáng tạo mới tham gia" subtitle="Các nhà sáng tạo được tạo gần đây trong hệ thống" />
                {newestCreators.length === 0 ? <EmptyState title="Chưa có nhà sáng tạo mới" description="Hệ thống chưa ghi nhận nhà sáng tạo mới tham gia." /> : (
                  <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
                    {newestCreators.map((item) => (
                      <article key={item.id} className="dc-card p-4">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="truncate font-semibold text-zinc-900">{item.displayName}</p>
                            <p className="mt-1 truncate text-xs text-zinc-500">{item.account.email}</p>
                          </div>
                          <StatusBadge status={item.status} />
                        </div>
                        <p className="mt-3 text-xs text-zinc-500">{item.mainPlatform} • {item.contentCategory ?? "-"}</p>
                        <p className="mt-1 text-xs font-medium text-zinc-700">Tham gia {formatJoinedDate(item.createdAt)}</p>
                      </article>
                    ))}
                  </div>
                )}
              </section>
              <section className="mt-6">
                <SectionHeader title="Tất cả nhà sáng tạo" subtitle={`Tổng ${filtered.length} nhà sáng tạo`} />
                {filtered.length === 0 ? <EmptyState title="Không có dữ liệu" description="Không có nhà sáng tạo phù hợp bộ lọc." /> : (
                  <>
                    <div className="grid gap-3">
                      {paginatedFiltered.map((item) => (
                        <article key={item.id} className="dc-card p-4">
                          <div className="flex flex-wrap items-center justify-between gap-3">
                            <div>
                              <p className="font-semibold">{item.displayName}</p>
                              <p className="text-xs text-zinc-500">{item.mainPlatform} • {item.contentCategory ?? "-"} • {item.account.email}</p>
                              <p className="mt-1 text-xs text-zinc-500">
                                Chiến dịch/nhiệm vụ: {item.campaignCount} • Chi trả: {item.payoutCount} • Kênh: {item.channelCount} • Tham gia: {formatJoinedDate(item.createdAt)}
                              </p>
                            </div>
                            <div className="flex flex-wrap justify-end gap-2">
                              <StatusBadge status={item.status} />
                              <StatusBadge status={item.verificationStatus} />
                              {item.riskFlag ? <StatusBadge status="risk" /> : null}
                            </div>
                          </div>
                          <div className="mt-3 flex flex-wrap gap-2">
                            <Link className="dc-btn-primary" href={`/admin/creators/${item.id}`}>Chi tiết</Link>
                            <Link className="dc-btn-secondary" href={`/admin/creators/${item.id}`}>Chỉnh sửa</Link>
                            <button className="rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-red-700" onClick={() => setDeleteTarget(item)}>Xóa</button>
                            <ManagementActionMenu
                              items={[
                                { key: "campaigns", label: "Xem chiến dịch" },
                                { key: "wallet", label: "Xem ví/hoa hồng" },
                                { key: "suspend", label: "Tạm khóa", danger: true },
                                { key: "unsuspend", label: "Mở khóa" }
                              ]}
                              onSelect={(key) => {
                                if (key === "campaigns") window.location.href = "/admin/campaigns";
                                if (key === "wallet") window.location.href = "/admin/finance";
                                if (key === "suspend") setAction({ type: "suspend", id: item.id });
                                if (key === "unsuspend") setAction({ type: "unsuspend", id: item.id });
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
        title={`Xóa nhà sáng tạo ${deleteTarget?.displayName ?? ""}`}
        confirmationLabel="tên nhà sáng tạo"
        expectedConfirmation={deleteTarget?.displayName ?? ""}
        impactUrl={`/api/admin/creators/${deleteTarget?.id ?? ""}?intent=delete-impact`}
        deleteUrl={`/api/admin/creators/${deleteTarget?.id ?? ""}`}
        modeOptions={[
          { value: "DELETE_ENTITY_ONLY", label: "Xóa hồ sơ nhà sáng tạo, giữ tài khoản người dùng" },
          { value: "DELETE_WITH_ACCOUNT", label: "Xóa nhà sáng tạo và tài khoản người dùng" },
          { value: "ANONYMIZE_RETAIN", label: "Ẩn danh và giữ lịch sử nghiệp vụ" }
        ]}
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
        title={action?.type === "suspend" ? "Tạm khóa nhà sáng tạo" : "Mở khóa nhà sáng tạo"}
        description="Bắt buộc nhập lý do để ghi audit log."
        requireReason
        submitting={acting}
        onCancel={() => !acting && setAction(null)}
        onConfirm={async (reason) => {
          if (!action) return;
          setActing(true);
          try {
            const endpoint = action.type === "suspend" ? "suspend" : "unsuspend";
            const res = await fetch(`/api/admin/creators/${action.id}/${endpoint}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ reason })
            });
            const body = await res.json();
            if (!res.ok || !body.success) throw new Error(body.error ?? "Thao tác thất bại");
            setToast(action.type === "suspend" ? "Đã tạm khóa nhà sáng tạo" : "Đã mở khóa nhà sáng tạo");
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
