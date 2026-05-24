"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ActionToast, EmptyState, ErrorState, LoadingSkeleton, PageHeader, SectionHeader, StatusBadge } from "@/app/components/dcreator/ui/base";

type CampaignItem = {
  id: string;
  title: string;
  slug: string;
  campaignType: "DONATION" | "PREORDER" | "SPONSORSHIP" | "COMMUNITY";
  setupSource: "JOIN_EXISTING_DCREATOR_CAMP" | "BRAND_REQUESTED";
  feasibilityStatus: string;
  status: string;
  budgetVnd: number;
  targetAmountVnd: number;
  fundedAmountVnd: number;
  backerCount: number;
  startsAt: string | null;
  endsAt: string | null;
  coverImageUrl: string | null;
  _count?: { contributions?: number; missions?: number };
  applicationCount?: number;
};

type ApiResponse<T> = { success: boolean; data?: T; error?: string; message?: string };

function formatVnd(value: number) {
  return `${value.toLocaleString("vi-VN")} VNĐ`;
}

function formatDate(value: string | null) {
  if (!value) return "Chưa đặt";
  return new Date(value).toLocaleDateString("vi-VN");
}

function progress(current: number, target: number) {
  if (target <= 0) return 0;
  return Math.min(100, Math.round((current / target) * 100));
}

export default function BrandCampaignsPage() {
  const [items, setItems] = useState<CampaignItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");

  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [setupSourceFilter, setSetupSourceFilter] = useState("");
  const [sortBy, setSortBy] = useState<"newest" | "funded" | "ending">("newest");

  async function load() {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/brand/dashboard/campaigns", { cache: "no-store" });
      const payload = (await response.json()) as ApiResponse<CampaignItem[]>;
      if (!response.ok || !payload.success || !payload.data) throw new Error(payload.error ?? "Không thể tải campaign");
      setItems(payload.data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Không thể tải campaign");
    } finally {
      setLoading(false);
    }
  }

  async function campaignAction(id: string, action: "submit" | "approve" | "feedback") {
    try {
      let endpoint = `/api/brand/dashboard/campaigns/${id}`;
      const method: "POST" | "PUT" = "POST";
      let body: Record<string, unknown> | undefined;

      if (action === "submit") endpoint = `${endpoint}/submit-review`;
      if (action === "approve") endpoint = `${endpoint}/brand-approve`;
      if (action === "feedback") {
        endpoint = `${endpoint}/brand-feedback`;
        body = { feedback: "Brand đề nghị điều chỉnh trước khi publish." };
      }

      const response = await fetch(endpoint, {
        method,
        headers: body ? { "Content-Type": "application/json" } : undefined,
        body: body ? JSON.stringify(body) : undefined
      });
      const payload = (await response.json()) as ApiResponse<unknown>;
      if (!response.ok || !payload.success) throw new Error(payload.error ?? "Thao tác thất bại");
      setToast("Cập nhật campaign thành công.");
      setTimeout(() => setToast(""), 2200);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Thao tác thất bại");
    }
  }

  useEffect(() => {
    void load();
  }, []);

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    let list = items.filter((item) => {
      if (normalized && !(`${item.title} ${item.slug}`.toLowerCase().includes(normalized))) return false;
      if (statusFilter && item.status !== statusFilter && item.feasibilityStatus !== statusFilter) return false;
      if (typeFilter && item.campaignType !== typeFilter) return false;
      if (setupSourceFilter && item.setupSource !== setupSourceFilter) return false;
      return true;
    });

    if (sortBy === "funded") {
      list = list.sort((a, b) => b.fundedAmountVnd - a.fundedAmountVnd);
    } else if (sortBy === "ending") {
      list = list.sort((a, b) => {
        const da = a.endsAt ? new Date(a.endsAt).getTime() : Number.MAX_SAFE_INTEGER;
        const db = b.endsAt ? new Date(b.endsAt).getTime() : Number.MAX_SAFE_INTEGER;
        return da - db;
      });
    } else {
      list = list.sort((a, b) => (new Date(b.startsAt ?? 0).getTime() - new Date(a.startsAt ?? 0).getTime()));
    }

    return list;
  }, [items, query, statusFilter, typeFilter, setupSourceFilter, sortBy]);

  return (
    <>
      <PageHeader
        title="Campaign / Job"
        subtitle="Quản lý danh sách campaign, trạng thái setup và hiệu suất huy động."
        action={<Link href="/dashboard/brand/campaign-setup" className="dc-btn-primary">Tạo campaign mới</Link>}
      />

      <section className="dc-card p-4">
        <div className="grid gap-2 md:grid-cols-5">
          <input className="dc-input" placeholder="Tìm tên campaign" value={query} onChange={(e) => setQuery(e.target.value)} />
          <input className="dc-input" placeholder="Filter status" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} />
          <select className="dc-input" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
            <option value="">Tất cả loại</option>
            <option value="DONATION">DONATION</option>
            <option value="PREORDER">PREORDER</option>
            <option value="SPONSORSHIP">SPONSORSHIP</option>
            <option value="COMMUNITY">COMMUNITY</option>
          </select>
          <select className="dc-input" value={setupSourceFilter} onChange={(e) => setSetupSourceFilter(e.target.value)}>
            <option value="">Tất cả setup source</option>
            <option value="BRAND_REQUESTED">BRAND_REQUESTED</option>
            <option value="JOIN_EXISTING_DCREATOR_CAMP">JOIN_EXISTING_DCREATOR_CAMP</option>
          </select>
          <select className="dc-input" value={sortBy} onChange={(e) => setSortBy(e.target.value as "newest" | "funded" | "ending") }>
            <option value="newest">Mới nhất</option>
            <option value="funded">Nhiều funding nhất</option>
            <option value="ending">Gần kết thúc</option>
          </select>
        </div>
      </section>

      {error ? <div className="mt-4"><ErrorState title="Không thể tải campaign" description={error} onRetry={() => void load()} /></div> : null}
      {loading ? <div className="mt-4"><LoadingSkeleton rows={5} /></div> : null}

      {!loading ? (
        <section className="mt-6">
          <SectionHeader title="Danh sách campaign" subtitle={`${filtered.length} campaign`} />
          {filtered.length === 0 ? (
            <EmptyState
              title="Chưa có campaign"
              description="Tạo campaign đầu tiên để bắt đầu thu hút creator và backer."
              action={<Link href="/dashboard/brand/campaign-setup" className="dc-btn-primary">Tạo campaign mới</Link>}
            />
          ) : (
            <div className="grid gap-4 xl:grid-cols-2">
              {filtered.map((campaign) => {
                const fundedProgress = progress(campaign.fundedAmountVnd, campaign.targetAmountVnd);
                const isDraft = campaign.status === "DRAFT";
                const isActive = campaign.status === "ACTIVE";
                return (
                  <article key={campaign.id} className="dc-card overflow-hidden p-0">
                    <div className="flex h-40 items-end bg-zinc-100" style={campaign.coverImageUrl ? { backgroundImage: `url(${campaign.coverImageUrl})`, backgroundSize: "cover", backgroundPosition: "center" } : undefined}>
                      <div className="w-full bg-black/50 px-4 py-3 text-white">
                        <p className="text-lg font-bold">{campaign.title}</p>
                        <p className="text-xs">/{campaign.slug}</p>
                      </div>
                    </div>
                    <div className="p-4">
                      <div className="mb-3 flex flex-wrap gap-2">
                        <StatusBadge status={campaign.status} />
                        <StatusBadge status={campaign.feasibilityStatus} />
                        <StatusBadge status={campaign.campaignType} />
                      </div>

                      <div className="grid gap-1 text-sm text-zinc-600 md:grid-cols-2">
                        <p>Setup source: {campaign.setupSource}</p>
                        <p>Ngân sách: {formatVnd(campaign.budgetVnd)}</p>
                        <p>Target: {formatVnd(campaign.targetAmountVnd)}</p>
                        <p>Đã huy động: {formatVnd(campaign.fundedAmountVnd)}</p>
                        <p>Creator ứng tuyển: {campaign.applicationCount ?? 0}</p>
                        <p>Backer: {campaign.backerCount.toLocaleString("vi-VN")}</p>
                        <p>Bắt đầu: {formatDate(campaign.startsAt)}</p>
                        <p>Kết thúc: {formatDate(campaign.endsAt)}</p>
                      </div>

                      <div className="mt-3">
                        <div className="h-2 rounded-full bg-zinc-200">
                          <div className="h-2 rounded-full bg-zinc-900" style={{ width: `${fundedProgress}%` }} />
                        </div>
                        <p className="mt-1 text-xs text-zinc-500">Tiến độ funding: {fundedProgress}%</p>
                      </div>

                      <div className="mt-4 flex flex-wrap gap-2">
                        <Link href={`/campaigns/${campaign.slug}`} className="dc-btn-secondary">Xem chi tiết</Link>
                        <Link href={`/dashboard/brand/campaigns/${campaign.id}/missions`} className="dc-btn-secondary">Quản lý mission/job</Link>
                        {isDraft ? <button className="dc-btn-secondary" onClick={() => void campaignAction(campaign.id, "submit")}>Gửi duyệt Admin</button> : null}
                        {campaign.status === "PAUSED" ? <button className="dc-btn-secondary" onClick={() => void campaignAction(campaign.id, "approve")}>Brand duyệt publish</button> : null}
                        {!isActive ? <button className="dc-btn-secondary" onClick={() => void campaignAction(campaign.id, "feedback")}>Yêu cầu điều chỉnh</button> : null}
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      ) : null}

      {toast ? <ActionToast message={toast} /> : null}
    </>
  );
}
