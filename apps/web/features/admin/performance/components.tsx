import Link from "next/link";
import type { ReactNode } from "react";
import { EmptyState } from "@/app/components/dcreator/ui/base";
import type { BrandPerformance, BrandPerformanceSortKey } from "./brandPerformance";
import type { CreatorPerformance, CreatorPerformanceSortKey, PerformanceStatus } from "./creatorPerformance";

type SummaryCard = {
  title: string;
  value: string;
  hint?: string;
};

const statusLabels: Record<PerformanceStatus, string> = {
  excellent: "Xuất sắc",
  good: "Tốt",
  average: "Trung bình",
  risky: "Rủi ro"
};

const statusClassNames: Record<PerformanceStatus, string> = {
  excellent: "border-emerald-200 bg-emerald-50 text-emerald-700",
  good: "border-blue-200 bg-blue-50 text-blue-700",
  average: "border-amber-200 bg-amber-50 text-amber-700",
  risky: "border-red-200 bg-red-50 text-red-700"
};

export function PerformanceStatusBadge({ status }: { status: PerformanceStatus }) {
  return (
    <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${statusClassNames[status]}`}>
      {statusLabels[status]}
    </span>
  );
}

export function PerformanceSummaryCards({ cards }: { cards: SummaryCard[] }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {cards.map((card) => (
        <article key={card.title} className="dc-card p-4">
          <p className="text-xs uppercase tracking-wider text-zinc-500">{card.title}</p>
          <p className="mt-2 text-2xl font-black text-zinc-900">{card.value}</p>
          {card.hint ? <p className="mt-1 text-xs text-zinc-500">{card.hint}</p> : null}
        </article>
      ))}
    </div>
  );
}

export function PerformanceFilters({
  search,
  searchPlaceholder,
  sort,
  sortOptions,
  status,
  timeRange,
  onSearchChange,
  onSortChange,
  onStatusChange,
  onTimeRangeChange
}: {
  search: string;
  searchPlaceholder: string;
  sort: string;
  sortOptions: { key: string; label: string }[];
  status: string;
  timeRange: string;
  onSearchChange: (value: string) => void;
  onSortChange: (value: string) => void;
  onStatusChange: (value: string) => void;
  onTimeRangeChange: (value: string) => void;
}) {
  return (
    <div className="dc-card grid gap-2 p-4 md:grid-cols-[1fr_170px_170px_220px]">
      <input className="dc-input" placeholder={searchPlaceholder} value={search} onChange={(event) => onSearchChange(event.target.value)} />
      <select className="dc-input" value={timeRange} onChange={(event) => onTimeRangeChange(event.target.value)}>
        <option value="ALL">Tất cả thời gian</option>
        <option value="THIS_MONTH">Tháng này</option>
        <option value="THIS_QUARTER">Quý này</option>
        <option value="THIS_YEAR">Năm này</option>
      </select>
      <select className="dc-input" value={status} onChange={(event) => onStatusChange(event.target.value)}>
        <option value="all">Tất cả trạng thái</option>
        <option value="excellent">Xuất sắc</option>
        <option value="good">Tốt</option>
        <option value="average">Trung bình</option>
        <option value="risky">Rủi ro</option>
      </select>
      <select className="dc-input" value={sort} onChange={(event) => onSortChange(event.target.value)}>
        {sortOptions.map((option) => <option key={option.key} value={option.key}>{option.label}</option>)}
      </select>
    </div>
  );
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 0 }).format(value);
}

function formatDate(value: string | null) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" }).format(new Date(value));
}

function TableShell({ children }: { children: ReactNode }) {
  return <div className="rounded-2xl border border-zinc-100 bg-white shadow-sm">{children}</div>;
}

function ColumnLabel({ children }: { children: ReactNode }) {
  return <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">{children}</p>;
}

function CompactMetric({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="min-w-0">
      <ColumnLabel>{label}</ColumnLabel>
      <div className="mt-1 text-sm font-semibold text-zinc-900">{value}</div>
    </div>
  );
}

function CompactActionLink({ href, tone, children }: { href: string; tone: "primary" | "secondary"; children: ReactNode }) {
  const className =
    tone === "primary"
      ? "inline-flex min-h-9 items-center justify-center rounded-xl bg-zinc-900 px-4 py-2 text-xs font-semibold !text-white hover:bg-zinc-800"
      : "inline-flex min-h-9 items-center justify-center rounded-xl border border-zinc-200 bg-white px-4 py-2 text-xs font-semibold text-zinc-700 hover:bg-zinc-50";

  return <Link className={className} href={href}>{children}</Link>;
}

export function CreatorPerformanceTable({ items }: { items: CreatorPerformance[] }) {
  if (items.length === 0) return <EmptyState title="Không có dữ liệu hiệu suất" description="Không có nhà sáng tạo phù hợp bộ lọc hiệu suất." />;

  return (
    <TableShell>
      <div className="hidden grid-cols-[48px_minmax(170px,1.3fr)_minmax(92px,.7fr)_minmax(92px,.7fr)_minmax(120px,.9fr)_minmax(96px,.7fr)_minmax(108px,.7fr)] gap-3 rounded-t-2xl bg-zinc-50 px-4 py-3 text-xs uppercase tracking-wider text-zinc-500 lg:grid">
        <span>Hạng</span>
        <span>Nhà sáng tạo</span>
        <span>Chiến dịch</span>
        <span>Nhiệm vụ</span>
        <span>Tài chính</span>
        <span>Điểm</span>
        <span>Thao tác</span>
      </div>
      <div className="divide-y divide-zinc-100">
        {items.map((item) => (
          <article key={item.id} className="grid gap-3 p-4 lg:grid-cols-[48px_minmax(170px,1.3fr)_minmax(92px,.7fr)_minmax(92px,.7fr)_minmax(120px,.9fr)_minmax(96px,.7fr)_minmax(108px,.7fr)] lg:items-start">
            <div className="font-bold text-zinc-900">#{item.rank}</div>
            <div className="min-w-0">
              <p className="truncate font-semibold text-zinc-900">{item.name}</p>
              <p className="mt-1 truncate text-xs text-zinc-500">{item.contact}</p>
              <p className="mt-1 truncate text-xs text-zinc-400">{item.socialHandle}</p>
              <p className="mt-1 text-xs text-zinc-400 lg:hidden">Hoạt động gần nhất: {formatDate(item.lastActivityDate)}</p>
            </div>
            <CompactMetric label="Chiến dịch" value={`${item.completedCampaigns} / ${item.totalCampaignsJoined}`} />
            <CompactMetric label="Nhiệm vụ" value={`${item.missionApproved} / ${item.missionSubmitted} (${item.approvalRate}%)`} />
            <div className="min-w-0">
              <ColumnLabel>Tài chính</ColumnLabel>
              <p className="mt-1 truncate text-sm font-semibold text-zinc-900">{formatCurrency(item.totalRevenueGenerated)} VNĐ</p>
              <p className="mt-1 truncate text-xs text-zinc-500">Đã chi trả {formatCurrency(item.totalPayout)} VNĐ</p>
            </div>
            <div className="min-w-0">
              <ColumnLabel>Điểm</ColumnLabel>
              <div className="mt-1 flex flex-wrap items-center gap-2">
                <span className="font-bold text-zinc-900">{item.score}</span>
                <PerformanceStatusBadge status={item.status} />
              </div>
              <p className="mt-1 hidden text-xs text-zinc-400 lg:block">{formatDate(item.lastActivityDate)}</p>
            </div>
            <div className="flex flex-wrap gap-2 lg:flex-col">
              <CompactActionLink tone="primary" href={`/admin/creators/${item.id}`}>Chi tiết</CompactActionLink>
              <CompactActionLink tone="secondary" href={`/admin/creators/${item.id}`}>Quản lý</CompactActionLink>
            </div>
          </article>
        ))}
      </div>
    </TableShell>
  );
}

export function BrandPerformanceTable({ items }: { items: BrandPerformance[] }) {
  if (items.length === 0) return <EmptyState title="Không có dữ liệu hiệu suất" description="Không có nhãn hàng phù hợp bộ lọc hiệu suất." />;

  return (
    <TableShell>
      <div className="hidden grid-cols-[48px_minmax(170px,1.3fr)_minmax(110px,.8fr)_minmax(104px,.7fr)_minmax(128px,.9fr)_minmax(96px,.7fr)_minmax(108px,.7fr)] gap-3 rounded-t-2xl bg-zinc-50 px-4 py-3 text-xs uppercase tracking-wider text-zinc-500 lg:grid">
        <span>Hạng</span>
        <span>Nhãn hàng</span>
        <span>Chiến dịch</span>
        <span>Vận hành</span>
        <span>Tài chính</span>
        <span>Điểm</span>
        <span>Thao tác</span>
      </div>
      <div className="divide-y divide-zinc-100">
        {items.map((item) => (
          <article key={item.id} className="grid gap-3 p-4 lg:grid-cols-[48px_minmax(170px,1.3fr)_minmax(110px,.8fr)_minmax(104px,.7fr)_minmax(128px,.9fr)_minmax(96px,.7fr)_minmax(108px,.7fr)] lg:items-start">
            <div className="font-bold text-zinc-900">#{item.rank}</div>
            <div className="min-w-0">
              <p className="truncate font-semibold text-zinc-900">{item.name}</p>
              <p className="mt-1 truncate text-xs text-zinc-500">{item.ownerEmail}</p>
              <p className="mt-1 text-xs text-zinc-400">Hoạt động gần nhất: {formatDate(item.lastActivityDate)}</p>
            </div>
            <div className="min-w-0">
              <ColumnLabel>Chiến dịch</ColumnLabel>
              <p className="mt-1 text-sm font-semibold text-zinc-900">{item.completedCampaigns} / {item.totalCampaignsCreated}</p>
              <p className="mt-1 text-xs text-zinc-500">Đang chạy {item.activeCampaigns}</p>
            </div>
            <div className="grid grid-cols-2 gap-3 lg:block">
              <CompactMetric label="Sản phẩm" value={item.totalProducts} />
              <div className="mt-0 lg:mt-3">
                <CompactMetric label="Giao dịch" value={item.totalTransactions} />
              </div>
            </div>
            <div className="min-w-0">
              <ColumnLabel>Tài chính</ColumnLabel>
              <p className="mt-1 truncate text-sm font-semibold text-zinc-900">{formatCurrency(item.totalRevenue)} VNĐ</p>
              <p className="mt-1 truncate text-xs text-zinc-500">Hạn mức {formatCurrency(item.creditBalance)} VNĐ</p>
            </div>
            <div className="min-w-0">
              <ColumnLabel>Điểm</ColumnLabel>
              <div className="mt-1 flex flex-wrap items-center gap-2">
                <span className="font-bold text-zinc-900">{item.score}</span>
                <PerformanceStatusBadge status={item.status} />
              </div>
            </div>
            <div className="flex flex-wrap gap-2 lg:flex-col">
              <CompactActionLink tone="primary" href={`/admin/brands/${item.id}`}>Chi tiết</CompactActionLink>
              <CompactActionLink tone="secondary" href={`/admin/brands/${item.id}`}>Quản lý</CompactActionLink>
            </div>
          </article>
        ))}
      </div>
    </TableShell>
  );
}

export const creatorPerformanceSortOptions: { key: CreatorPerformanceSortKey; label: string }[] = [
  { key: "score-desc", label: "Điểm cao nhất" },
  { key: "revenue-desc", label: "Doanh thu cao nhất" },
  { key: "completed-campaigns-desc", label: "Chiến dịch hoàn thành nhiều nhất" },
  { key: "approval-rate-desc", label: "Tỷ lệ duyệt cao nhất" }
];

export const brandPerformanceSortOptions: { key: BrandPerformanceSortKey; label: string }[] = [
  { key: "score-desc", label: "Điểm cao nhất" },
  { key: "revenue-desc", label: "Doanh thu cao nhất" },
  { key: "campaigns-desc", label: "Chiến dịch nhiều nhất" },
  { key: "credit-balance-desc", label: "Hạn mức cao nhất" }
];
