"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { EmptyState, ErrorState, LoadingSkeleton, PageHeader, SectionHeader, StatusBadge } from "@/app/components/dcreator/ui/base";

type ApiResult<T> = { success: boolean; data: T; error?: string };
type CampaignRequestItem = {
  id: string;
  requestedSlug: string;
  title: string;
  brief: string;
  status: string;
  benefits: string | null;
  participationRoadmap: string[];
  objective?: string | null;
  priorityChannels?: string | null;
  adminNote: string | null;
  brandFeedback: string | null;
  budgetVnd: number;
  targetAmountVnd: number;
  brand: { name: string; contactEmail: string };
  createdCampaign: { id: string; slug: string; title: string; status: string } | null;
};
type CampaignItem = {
  id: string;
  slug: string;
  title: string;
  brief: string;
  status: string;
  statusView?: string;
  budgetVnd: number;
  targetAmountVnd: number;
  fundedAmountVnd: number;
  backerCount: number;
  brand: { id: string; displayName: string; email: string };
  missions?: Array<{ id: string }>;
  rewards?: Array<{ id: string }>;
  startsAt?: string | null;
  endsAt?: string | null;
  updatedAt?: string;
};

const statusOptions = [
  { value: "", label: "Tất cả" },
  { value: "PENDING_REVIEW", label: "Chờ duyệt" },
  { value: "NEEDS_REVISION", label: "Cần chỉnh sửa" },
  { value: "APPROVED", label: "Đã duyệt" },
  { value: "REJECTED", label: "Từ chối" }
];

const COVER_MARKER = "[[COVER_IMAGE_URL]]:";
const CONTENT_FILE_MARKER = "[[CONTENT_FILE_URL]]:";

function parseRequestBrief(rawBrief: string) {
  const lines = rawBrief.split("\n");
  const contentFileLine = lines.find((line) => line.trim().startsWith(CONTENT_FILE_MARKER));
  const contentFileUrl = contentFileLine ? contentFileLine.trim().slice(CONTENT_FILE_MARKER.length).trim() : "";
  const cleanBrief = lines
    .filter((line) => !line.trim().startsWith(COVER_MARKER) && !line.trim().startsWith(CONTENT_FILE_MARKER))
    .join("\n")
    .trim();
  return { cleanBrief, contentFileUrl };
}

export default function AdminCampaignsPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("PENDING_REVIEW");
  const [query, setQuery] = useState("");
  const [requestItems, setRequestItems] = useState<CampaignRequestItem[]>([]);
  const [campaignItems, setCampaignItems] = useState<CampaignItem[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      if (status) params.set("status", status);
      if (query.trim()) params.set("query", query.trim());
      const [reviewRes, campaignRes] = await Promise.all([
        fetch(`/api/admin/dashboard/campaign-reviews?${params.toString()}`, { cache: "no-store" }),
        fetch(`/api/admin/campaigns${query.trim() ? `?query=${encodeURIComponent(query.trim())}` : ""}`, { cache: "no-store" })
      ]);
      const reviewBody = (await reviewRes.json()) as ApiResult<CampaignRequestItem[]>;
      const campaignBody = (await campaignRes.json()) as ApiResult<CampaignItem[]>;
      if (!reviewRes.ok || !reviewBody.success) throw new Error(reviewBody.error ?? "Không tải được yêu cầu campaign");
      if (!campaignRes.ok || !campaignBody.success) throw new Error(campaignBody.error ?? "Không tải được danh sách campaign hệ thống");
      setRequestItems(reviewBody.data);
      setCampaignItems(campaignBody.data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Không tải được yêu cầu campaign");
    } finally {
      setLoading(false);
    }
  }, [query, status]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <>
      <PageHeader
        title="Campaign CMS"
        subtitle="Tiếp nhận thông tin từ Brand; Admin chủ động tạo campaign trong hệ thống."
        action={(
          <div className="flex gap-2">
            <Link className="dc-btn-primary" href="/admin/campaigns/create">Tạo campaign</Link>
            <button className="dc-btn-secondary" onClick={() => void load()}>Làm mới</button>
          </div>
        )}
      />
      <section className="dc-card p-4">
        <div className="flex flex-wrap gap-2">
          <select className="dc-input max-w-72" value={status} onChange={(e) => setStatus(e.target.value)}>
            {statusOptions.map((option) => (
              <option key={option.value || "all"} value={option.value}>{option.label}</option>
            ))}
          </select>
          <input className="dc-input max-w-96" placeholder="Tìm campaign/brand" value={query} onChange={(e) => setQuery(e.target.value)} />
          <button className="dc-btn-primary" onClick={() => void load()}>Lọc</button>
        </div>
      </section>

      {loading ? <div className="mt-4"><LoadingSkeleton rows={4} /></div> : null}
      {error ? <div className="mt-4"><ErrorState title="Không tải được yêu cầu campaign" description={error} onRetry={() => void load()} /></div> : null}

      {!loading && !error ? (
        <section className="mt-4">
          <SectionHeader title="Yêu cầu campaign chờ Admin" subtitle={`Tổng ${requestItems.length} yêu cầu`} />
          {requestItems.length === 0 ? (
            <EmptyState title="Không có yêu cầu phù hợp" description="Không có dữ liệu theo bộ lọc hiện tại." />
          ) : (
            <div className="grid gap-3">
              {requestItems.map((item) => (
                <article key={item.id} className="dc-card p-4">
                  {(() => {
                    const { cleanBrief, contentFileUrl } = parseRequestBrief(item.brief);
                    return (
                      <>
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="font-semibold text-zinc-900">{item.title}</p>
                      <p className="text-sm text-zinc-600">/{item.requestedSlug} - #{item.id.slice(0, 8)}</p>
                      <p className="text-sm text-zinc-600">Brand: {item.brand.name} - {item.brand.contactEmail}</p>
                    </div>
                    <StatusBadge status={item.status.toLowerCase()} />
                  </div>
                  <p className="mt-3 text-sm text-zinc-600">{cleanBrief}</p>
                  {contentFileUrl ? (
                    <a className="mt-3 inline-flex w-fit rounded-xl border border-sky-200 bg-sky-50 px-3 py-2 text-sm font-semibold text-sky-700 hover:bg-sky-100" href={contentFileUrl} target="_blank" rel="noreferrer">
                      Mở file nội dung campaign
                    </a>
                  ) : null}
                  <div className="mt-3 grid gap-2 text-sm text-zinc-600 md:grid-cols-3">
                    <p>Quyền lợi: <span className="font-semibold text-zinc-900">{item.benefits || item.objective || "Không có"}</span></p>
                    <p>Lộ trình tham gia: <span className="font-semibold text-zinc-900">{item.participationRoadmap?.length ? `${item.participationRoadmap.length} bước` : item.priorityChannels || "Không có"}</span></p>
                    <p>Ngân sách: <span className="font-semibold text-zinc-900">{item.budgetVnd.toLocaleString("vi-VN")}đ</span></p>
                    <p>Target: <span className="font-semibold text-zinc-900">{item.targetAmountVnd.toLocaleString("vi-VN")}đ</span></p>
                    <p>Trạng thái request: <span className="font-semibold text-zinc-900">{item.status}</span></p>
                  </div>
                  {item.adminNote ? <p className="mt-3 rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-600">Admin note: {item.adminNote}</p> : null}
                  {item.brandFeedback ? <p className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700">Brand phản hồi: {item.brandFeedback}</p> : null}
                  {item.createdCampaign ? <p className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">Đã tạo campaign: {item.createdCampaign.title} /{item.createdCampaign.slug}</p> : null}
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Link className="dc-btn-primary" href="/admin/campaigns/create">Tạo campaign từ thông tin này</Link>
                  </div>
                      </>
                    );
                  })()}
                </article>
              ))}
            </div>
          )}
        </section>
      ) : null}

      {!loading && !error ? (
        <section className="mt-6">
          <SectionHeader title="Danh sách campaign hệ thống" subtitle={`Tổng ${campaignItems.length} campaign`} />
          {campaignItems.length === 0 ? (
            <EmptyState title="Chưa có campaign" description="Campaign sẽ hiển thị tại đây sau khi được tạo." />
          ) : (
            <div className="grid gap-3">
              {campaignItems.map((campaign) => (
                <article key={campaign.id} className="dc-card p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="font-semibold text-zinc-900">{campaign.title}</p>
                      <p className="text-sm text-zinc-600">/{campaign.slug} - #{campaign.id.slice(0, 8)}</p>
                      <p className="text-sm text-zinc-600">Brand: {campaign.brand.displayName} - {campaign.brand.email}</p>
                    </div>
                    <StatusBadge status={(campaign.statusView ?? campaign.status).toLowerCase()} />
                  </div>
                  <p className="mt-3 line-clamp-2 text-sm text-zinc-600">{campaign.brief}</p>
                  <div className="mt-3 grid gap-2 text-sm text-zinc-600 md:grid-cols-3">
                    <p>Ngân sách: <span className="font-semibold text-zinc-900">{campaign.budgetVnd.toLocaleString("vi-VN")}đ</span></p>
                    <p>Target: <span className="font-semibold text-zinc-900">{campaign.targetAmountVnd.toLocaleString("vi-VN")}đ</span></p>
                    <p>Đã huy động: <span className="font-semibold text-zinc-900">{campaign.fundedAmountVnd.toLocaleString("vi-VN")}đ</span></p>
                    <p>Backer: <span className="font-semibold text-zinc-900">{campaign.backerCount.toLocaleString("vi-VN")}</span></p>
                    <p>Missions: <span className="font-semibold text-zinc-900">{campaign.missions?.length ?? 0}</span></p>
                    <p>Rewards: <span className="font-semibold text-zinc-900">{campaign.rewards?.length ?? 0}</span></p>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Link className="dc-btn-secondary" href={`/admin/campaigns/${campaign.id}`}>Quản lý campaign</Link>
                    <Link className="dc-btn-primary" href={`/admin/campaigns/${campaign.id}/missions`}>Quản lý mission/job</Link>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      ) : null}
    </>
  );
}
