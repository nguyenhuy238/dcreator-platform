"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ReviewActionDialog } from "@/app/admin/_components/ReviewActionDialog";
import { ActionToast, EmptyState, ErrorState, LoadingSkeleton, PageHeader, StatsCard, StatusBadge } from "@/app/components/dcreator/ui/base";

type SocialLinkStatus = "PENDING" | "APPROVED" | "REJECTED";

type ApiResult<T> = { success: boolean; data: T; error?: string };

type CreatorRow = {
  id: string;
  status: SocialLinkStatus;
  displayName: string;
  mainPlatform: string;
  socialUrl: string;
  contentCategory: string | null;
  followerCount: number | null;
  bio: string | null;
  phone: string | null;
  reviewNote: string | null;
  rejectReason: string | null;
  createdAt: string;
  reviewedAt: string | null;
  account: { id: string; email: string; displayName: string; profile: { phone: string | null } | null };
  reviewedBy: { id: string; displayName: string; email: string } | null;
};

type HistoryItem = {
  id: string;
  action: string;
  oldStatus: string | null;
  newStatus: string | null;
  reason: string | null;
  createdAt: string;
  actor: { id: string; displayName: string; email: string } | null;
};

type CreatorDetail = CreatorRow & {
  account: CreatorRow["account"] & {
    creatorProfile: {
      id: string;
      mainPlatform: string | null;
      socialUrl: string | null;
      handle: string | null;
      followerCount: number | null;
      contentCategory: string | null;
    } | null;
  };
  statusHistory: HistoryItem[];
};

type StatusFilter = "" | SocialLinkStatus;
const PLATFORM_OPTIONS = ["", "TIKTOK", "YOUTUBE", "FACEBOOK", "INSTAGRAM", "OTHER"] as const;

export default function AdminCreatorRequestsPage() {
  const [items, setItems] = useState<CreatorRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");
  const [status, setStatus] = useState<StatusFilter>("PENDING");
  const [platform, setPlatform] = useState<(typeof PLATFORM_OPTIONS)[number]>("");
  const [sort, setSort] = useState<"newest" | "oldest">("newest");
  const [query, setQuery] = useState("");
  const [detailId, setDetailId] = useState<string | null>(null);
  const [detail, setDetail] = useState<CreatorDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [dialogAction, setDialogAction] = useState<"approve" | "reject" | null>(null);
  const [acting, setActing] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      if (status) params.set("status", status);
      if (platform) params.set("platform", platform);
      if (query.trim()) params.set("query", query.trim());
      params.set("sort", sort);
      const res = await fetch(`/api/admin/creator-requests?${params.toString()}`, { cache: "no-store" });
      const body = (await res.json()) as ApiResult<CreatorRow[]>;
      if (!res.ok || !body.success) throw new Error(body.error ?? "Tải danh sách thất bại");
      setItems(body.data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Tải danh sách thất bại");
    } finally {
      setLoading(false);
    }
  }, [platform, query, sort, status]);

  const loadDetail = useCallback(async (id: string) => {
    setDetailLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/creator-requests/${id}`, { cache: "no-store" });
      const body = (await res.json()) as ApiResult<CreatorDetail>;
      if (!res.ok || !body.success) throw new Error(body.error ?? "Tải chi tiết thất bại");
      setDetail(body.data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Tải chi tiết thất bại");
    } finally {
      setDetailLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!detailId) return;
    void loadDetail(detailId);
  }, [detailId, loadDetail]);

  const stats = useMemo(() => {
    const total = items.length;
    const pending = items.filter((item) => item.status === "PENDING").length;
    const approved = items.filter((item) => item.status === "APPROVED").length;
    const rejected = items.filter((item) => item.status === "REJECTED").length;
    return { total, pending, approved, rejected };
  }, [items]);

  async function submitDecision(reason?: string) {
    if (!detail) return;
    const action = dialogAction;
    if (!action) return;

    setActing(true);
    setError("");
    try {
      const endpoint = action === "approve" ? "approve" : "reject";
      const payload = action === "approve" ? undefined : { reason: reason?.trim() };
      const res = await fetch(`/api/admin/creator-requests/${detail.id}/${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: payload ? JSON.stringify(payload) : undefined
      });
      const body = (await res.json()) as ApiResult<unknown>;
      if (!res.ok || !body.success) throw new Error(body.error ?? "Cập nhật thất bại");
      setDialogAction(null);
      setToast("Cập nhật trạng thái thành công");
      setTimeout(() => setToast(""), 1800);
      await Promise.all([load(), loadDetail(detail.id)]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Cập nhật thất bại");
    } finally {
      setActing(false);
    }
  }

  return (
    <main>
      <PageHeader
        title="Quản lý yêu cầu kênh Creator"
        subtitle="Quản lý yêu cầu thêm kênh mạng xã hội của Creator và quyết định duyệt/từ chối."
        action={<button className="dc-btn-secondary" onClick={() => void load()}>Làm mới</button>}
      />

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatsCard title="Tổng yêu cầu" value={String(stats.total)} />
        <StatsCard title="Đang chờ duyệt" value={String(stats.pending)} />
        <StatsCard title="Đã duyệt" value={String(stats.approved)} />
        <StatsCard title="Đã từ chối" value={String(stats.rejected)} />
      </section>

      <section className="dc-card mt-4 p-4">
        <div className="grid gap-2 md:grid-cols-4">
          <input className="dc-input" placeholder="Tìm tên, email, URL kênh" value={query} onChange={(e) => setQuery(e.target.value)} />
          <select className="dc-input" value={status} onChange={(e) => setStatus(e.target.value as StatusFilter)}>
            <option value="">Tất cả trạng thái</option>
            <option value="PENDING">PENDING</option>
            <option value="APPROVED">APPROVED</option>
            <option value="REJECTED">REJECTED</option>
          </select>
          <select className="dc-input" value={platform} onChange={(e) => setPlatform(e.target.value as (typeof PLATFORM_OPTIONS)[number])}>
            <option value="">Tất cả nền tảng</option>
            {PLATFORM_OPTIONS.filter(Boolean).map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
          <select className="dc-input" value={sort} onChange={(e) => setSort(e.target.value as "newest" | "oldest") }>
            <option value="newest">Mới nhất</option>
            <option value="oldest">Cũ nhất</option>
          </select>
        </div>
      </section>

      {loading ? <div className="mt-4"><LoadingSkeleton rows={5} /></div> : null}
      {error ? <div className="mt-4"><ErrorState title="Không tải được yêu cầu Creator" description={error} onRetry={() => void load()} /></div> : null}
      {!loading && !error && items.length === 0 ? <div className="mt-4"><EmptyState title="Không có yêu cầu" description="Không có CreatorSocialLink phù hợp bộ lọc." /></div> : null}

      {!loading && !error && items.length > 0 ? (
        <>
          <div className="mt-4 hidden overflow-x-auto rounded-2xl border border-zinc-200 bg-white lg:block">
            <table className="min-w-full text-sm">
              <thead className="bg-zinc-50 text-left text-zinc-600">
                <tr>
                  <th className="px-4 py-3">Creator</th>
                  <th className="px-4 py-3">Nền tảng</th>
                  <th className="px-4 py-3">Thông tin kênh</th>
                  <th className="px-4 py-3">Trạng thái</th>
                  <th className="px-4 py-3">Ngày gửi</th>
                  <th className="px-4 py-3">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id} className="border-t border-zinc-100 align-top">
                    <td className="px-4 py-3">
                      <p className="font-semibold">{item.displayName}</p>
                      <p className="text-zinc-500">{item.account.displayName} - {item.account.email}</p>
                    </td>
                    <td className="px-4 py-3">
                      {item.mainPlatform}
                      <p className="text-zinc-500">{item.contentCategory ?? "-"}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p>Follower: {(item.followerCount ?? 0).toLocaleString("vi-VN")}</p>
                      <p>{item.account.profile?.phone ?? item.phone ?? "-"}</p>
                      <a href={item.socialUrl} target="_blank" rel="noreferrer" className="break-all text-blue-700 underline">{item.socialUrl}</a>
                    </td>
                    <td className="px-4 py-3"><StatusBadge status={item.status} /></td>
                    <td className="px-4 py-3">{new Date(item.createdAt).toLocaleString("vi-VN")}</td>
                    <td className="px-4 py-3"><button className="dc-btn-primary" onClick={() => setDetailId(item.id)}>Xem chi tiết</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-4 grid gap-3 lg:hidden">
            {items.map((item) => (
              <article key={item.id} className="dc-card p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold">{item.displayName}</p>
                    <p className="text-xs text-zinc-500">{item.account.email}</p>
                  </div>
                  <StatusBadge status={item.status} />
                </div>
                <p className="mt-2 text-sm">{item.mainPlatform} • {item.contentCategory ?? "Không có"}</p>
                <p className="text-sm">Follower: {(item.followerCount ?? 0).toLocaleString("vi-VN")}</p>
                <a href={item.socialUrl} target="_blank" rel="noreferrer" className="mt-1 block break-all text-sm text-blue-700 underline">{item.socialUrl}</a>
                <button className="dc-btn-primary mt-3" onClick={() => setDetailId(item.id)}>Xem chi tiết</button>
              </article>
            ))}
          </div>
        </>
      ) : null}

      {detailId ? (
        <div
          className="fixed inset-0 z-50 bg-black/50 p-3 sm:p-6"
          onClick={() => {
            setDetailId(null);
            setDialogAction(null);
          }}
        >
          <div className="mx-auto h-full w-full max-w-4xl overflow-auto rounded-2xl bg-white p-4 sm:p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-xl font-bold">Chi tiết yêu cầu kênh Creator</h2>
              <button
                className="dc-btn-secondary"
                onClick={() => {
                  setDetailId(null);
                  setDialogAction(null);
                }}
              >
                Đóng
              </button>
            </div>
            {detailLoading || !detail ? <div className="mt-4"><LoadingSkeleton rows={4} /></div> : (
              <div className="mt-4 grid gap-4">
                <section className="dc-card p-4 text-sm">
                  <div className="flex items-center justify-between"><p className="font-semibold">{detail.displayName}</p><StatusBadge status={detail.status} /></div>
                  <p className="mt-1">Account: {detail.account.displayName} - {detail.account.email}</p>
                  <p>Phone: {detail.account.profile?.phone ?? detail.phone ?? "-"}</p>
                  <p>Platform yêu cầu: {detail.mainPlatform}</p>
                  <p>Content: {detail.contentCategory ?? "-"}</p>
                  <p>Followers: {(detail.followerCount ?? 0).toLocaleString("vi-VN")}</p>
                  <p>Bio: {detail.bio ?? "-"}</p>
                  <p>Ghi chú admin: {detail.reviewNote ?? "-"}</p>
                  <p>Lý do từ chối: {detail.rejectReason ?? "-"}</p>
                  <p>Người duyệt: {detail.reviewedBy?.displayName ?? "-"}</p>
                  <p>Duyệt lúc: {detail.reviewedAt ? new Date(detail.reviewedAt).toLocaleString("vi-VN") : "-"}</p>
                  <a href={detail.socialUrl} target="_blank" rel="noreferrer" className="mt-1 block break-all text-blue-700 underline">{detail.socialUrl}</a>
                </section>

                <section className="dc-card p-4 text-sm">
                  <p className="font-semibold">Lịch sử trạng thái</p>
                  <div className="mt-2 grid gap-2">
                    {detail.statusHistory.length === 0 ? <p className="text-zinc-500">Chưa có lịch sử.</p> : detail.statusHistory.map((item) => (
                      <div key={item.id} className="rounded-xl border border-zinc-200 p-3">
                        <p className="font-medium">{item.action}</p>
                        <p className="text-zinc-600">{item.oldStatus ?? "-"} → {item.newStatus ?? "-"}</p>
                        <p className="text-zinc-600">{item.actor?.displayName ?? "System"} • {new Date(item.createdAt).toLocaleString("vi-VN")}</p>
                        {item.reason ? <p className="text-zinc-700">{item.reason}</p> : null}
                      </div>
                    ))}
                  </div>
                </section>

                <section className="dc-card p-4">
                  <p className="font-semibold">Thao tác duyệt</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      className="dc-btn-primary"
                      disabled={acting || detail.status !== "PENDING"}
                      onClick={() => {
                        setDialogAction("approve");
                      }}
                    >
                      Đồng ý
                    </button>
                    <button
                      className="dc-btn-secondary"
                      disabled={acting || detail.status !== "PENDING"}
                      onClick={() => {
                        setDialogAction("reject");
                      }}
                    >
                      Từ chối
                    </button>
                  </div>
                </section>
              </div>
            )}
          </div>
        </div>
      ) : null}

      <ReviewActionDialog
        open={dialogAction === "approve"}
        title="Xác nhận đồng ý yêu cầu"
        description="Yêu cầu kênh sẽ được duyệt và chuyển sang APPROVED."
        confirmLabel="Xác nhận"
        submitting={acting}
        onCancel={() => !acting && setDialogAction(null)}
        onConfirm={() => void submitDecision()}
      />
      <ReviewActionDialog
        open={dialogAction === "reject"}
        title="Xác nhận từ chối yêu cầu"
        description="Yêu cầu kênh sẽ bị từ chối và Creator sẽ thấy lý do."
        confirmLabel="Từ chối"
        requireReason
        reasonPlaceholder="Nhập lý do từ chối (bắt buộc)..."
        submitting={acting}
        onCancel={() => !acting && setDialogAction(null)}
        onConfirm={(reason) => void submitDecision(reason)}
      />

      {toast ? <ActionToast message={toast} /> : null}
    </main>
  );
}
