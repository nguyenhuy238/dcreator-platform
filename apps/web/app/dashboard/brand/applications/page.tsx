"use client";

import { useEffect, useMemo, useState } from "react";
import { ActionToast, EmptyState, ErrorState, LoadingSkeleton, PageHeader, SectionHeader, StatusBadge } from "@/app/components/dcreator/ui/base";

type ApplicationItem = {
  id: string;
  lifecycleStatus: string;
  status: string;
  note: string | null;
  createdAt: string;
  account: {
    id: string;
    displayName: string;
    email: string;
    creatorProfile: {
      mainPlatform: string;
      socialUrl: string;
      followerCount: number | null;
      bio: string | null;
      contentCategory: string | null;
      portfolioUrl: string | null;
      location: string | null;
      expectedRate: number | null;
      maxJobsPerMonth: number | null;
    } | null;
    submissions: Array<{
      id: string;
      lifecycleStatus: string;
      updatedAt: string;
      mission: {
        id: string;
        title: string;
        campaign: {
          id: string;
          title: string;
          slug: string;
          status: string;
        };
      };
    }>;
  };
  mission: {
    id: string;
    title: string;
    audience: string;
    campaign: { id: string; title: string };
  };
};

type ApiResponse<T> = { success: boolean; data?: T; error?: string };

export default function BrandApplicationsPage() {
  const [items, setItems] = useState<ApplicationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");

  const [query, setQuery] = useState("");
  const [campaignFilter, setCampaignFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [platformFilter, setPlatformFilter] = useState("");
  const [expandedCreator, setExpandedCreator] = useState<Record<string, boolean>>({});

  async function load() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/brand/dashboard/creator-applications", { cache: "no-store" });
      const payload = (await res.json()) as ApiResponse<ApplicationItem[]>;
      if (!res.ok || !payload.success || !payload.data) throw new Error(payload.error ?? "Không thể tải đơn ứng tuyển");
      setItems(payload.data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Không thể tải đơn ứng tuyển");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function decide(submissionId: string, decision: "APPROVED" | "REJECTED") {
    const note = decision === "REJECTED" ? (window.prompt("Nhập lý do từ chối (bắt buộc):", "Chưa phù hợp brief campaign") ?? "") : "Đã duyệt ứng tuyển";
    if (decision === "REJECTED" && note.trim().length < 5) return;

    try {
      const res = await fetch("/api/brand/dashboard/creator-applications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ submissionId, decision, note })
      });
      const payload = (await res.json()) as ApiResponse<unknown>;
      if (!res.ok || !payload.success) throw new Error(payload.error ?? "Thao tác thất bại");
      setToast(decision === "APPROVED" ? "Đã duyệt creator." : "Đã từ chối creator.");
      setTimeout(() => setToast(""), 2200);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Thao tác thất bại");
    }
  }

  const campaigns = useMemo(() => Array.from(new Set(items.map((x) => `${x.mission.campaign.id}|${x.mission.campaign.title}`))), [items]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((item) => {
      if (q && !(`${item.account.displayName} ${item.account.email} ${item.mission.title}`.toLowerCase().includes(q))) return false;
      if (campaignFilter && item.mission.campaign.id !== campaignFilter) return false;
      if (statusFilter && item.lifecycleStatus !== statusFilter && item.status !== statusFilter) return false;
      if (platformFilter && item.account.creatorProfile?.mainPlatform !== platformFilter) return false;
      return true;
    });
  }, [items, query, campaignFilter, statusFilter, platformFilter]);

  return (
    <>
      <PageHeader title="Creator ứng tuyển" subtitle="Quản lý đơn ứng tuyển creator theo từng campaign." />

      <section className="dc-card p-4">
        <div className="grid gap-2 md:grid-cols-4">
          <input className="dc-input" placeholder="Tìm creator" value={query} onChange={(e) => setQuery(e.target.value)} />
          <select className="dc-input" value={campaignFilter} onChange={(e) => setCampaignFilter(e.target.value)}>
            <option value="">Tất cả campaign</option>
            {campaigns.map((entry) => {
              const [id, title] = entry.split("|");
              return <option key={id} value={id}>{title}</option>;
            })}
          </select>
          <input className="dc-input" placeholder="Filter status" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} />
          <select className="dc-input" value={platformFilter} onChange={(e) => setPlatformFilter(e.target.value)}>
            <option value="">Tất cả nền tảng</option>
            <option value="TIKTOK">TIKTOK</option>
            <option value="FACEBOOK">FACEBOOK</option>
            <option value="INSTAGRAM">INSTAGRAM</option>
            <option value="YOUTUBE">YOUTUBE</option>
            <option value="OTHER">OTHER</option>
          </select>
        </div>
      </section>

      {error ? <div className="mt-4"><ErrorState title="Không thể tải applications" description={error} onRetry={() => void load()} /></div> : null}
      {loading ? <div className="mt-4"><LoadingSkeleton rows={5} /></div> : null}

      {!loading ? (
        <section className="mt-6">
          <SectionHeader title="Danh sách đơn ứng tuyển" subtitle={`${filtered.length} đơn`} />
          {filtered.length === 0 ? (
            <EmptyState title="Chưa có đơn ứng tuyển" description="Đơn ứng tuyển sẽ xuất hiện khi creator apply campaign." />
          ) : (
            <div className="grid gap-4">
              {filtered.map((item) => (
                <article key={item.id} className="dc-card p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="font-semibold text-zinc-900">{item.account.displayName}</p>
                      <p className="text-sm text-zinc-600">{item.account.email}</p>
                    </div>
                    <div className="flex gap-2">
                      <StatusBadge status={item.lifecycleStatus} />
                      <StatusBadge status={item.status} />
                    </div>
                  </div>
                  <div className="mt-2 grid gap-1 text-sm text-zinc-600 md:grid-cols-2">
                    <p>Campaign: {item.mission.campaign.title}</p>
                    <p>Mission: {item.mission.title}</p>
                    <p>Nền tảng: {item.account.creatorProfile?.mainPlatform ?? "Chưa cập nhật"}</p>
                    <p>Follower: {(item.account.creatorProfile?.followerCount ?? 0).toLocaleString("vi-VN")}</p>
                    <p>Social: {item.account.creatorProfile?.socialUrl ?? "Chưa cập nhật"}</p>
                    <p>Ngày ứng tuyển: {new Date(item.createdAt).toLocaleString("vi-VN")}</p>
                  </div>
                  {item.note ? <p className="mt-2 text-sm text-zinc-700">Ghi chú: {item.note}</p> : null}
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      className="dc-btn-secondary"
                      onClick={() => setExpandedCreator((current) => ({ ...current, [item.id]: !current[item.id] }))}
                    >
                      {expandedCreator[item.id] ? "Ẩn hồ sơ" : "Xem hồ sơ & dự án cũ"}
                    </button>
                    <button className="dc-btn-primary" onClick={() => void decide(item.id, "APPROVED")}>Duyệt creator</button>
                    <button className="dc-btn-secondary" onClick={() => void decide(item.id, "REJECTED")}>Từ chối creator</button>
                    <button className="dc-btn-secondary" onClick={() => window.alert("Tính năng gửi brief/mission sẽ dùng khi mission setup hoàn tất.")}>Gửi brief</button>
                  </div>
                  {expandedCreator[item.id] ? (
                    <div className="mt-3 rounded-2xl border border-zinc-200 bg-zinc-50 p-3">
                      <p className="text-sm font-semibold text-zinc-900">Hồ sơ Creator</p>
                      <div className="mt-2 grid gap-1 text-sm text-zinc-600 md:grid-cols-2">
                        <p>Ngành nội dung: {item.account.creatorProfile?.contentCategory || "Chưa cập nhật"}</p>
                        <p>Khu vực: {item.account.creatorProfile?.location || "Chưa cập nhật"}</p>
                        <p>Rate kỳ vọng: {item.account.creatorProfile?.expectedRate != null ? `${item.account.creatorProfile.expectedRate.toLocaleString("vi-VN")} VND` : "Chưa cập nhật"}</p>
                        <p>Công suất: {item.account.creatorProfile?.maxJobsPerMonth != null ? `${item.account.creatorProfile.maxJobsPerMonth} job/tháng` : "Chưa cập nhật"}</p>
                        <p className="md:col-span-2">Portfolio: {item.account.creatorProfile?.portfolioUrl || "Chưa cập nhật"}</p>
                        <p className="md:col-span-2">Bio: {item.account.creatorProfile?.bio || "Chưa cập nhật"}</p>
                      </div>
                      <p className="mt-3 text-sm font-semibold text-zinc-900">Dự án cũ đã tham gia</p>
                      {item.account.submissions.length === 0 ? (
                        <p className="mt-1 text-sm text-zinc-600">Chưa có lịch sử dự án đã duyệt.</p>
                      ) : (
                        <div className="mt-2 grid gap-2">
                          {item.account.submissions.map((submission) => (
                            <div key={submission.id} className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-700">
                              <p className="font-semibold text-zinc-900">{submission.mission.campaign.title}</p>
                              <p>Mission: {submission.mission.title}</p>
                              <p>Trạng thái: {submission.lifecycleStatus}</p>
                              <p>Cập nhật: {new Date(submission.updatedAt).toLocaleString("vi-VN")}</p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : null}
                </article>
              ))}
            </div>
          )}
        </section>
      ) : null}

      {toast ? <ActionToast message={toast} /> : null}
    </>
  );
}
