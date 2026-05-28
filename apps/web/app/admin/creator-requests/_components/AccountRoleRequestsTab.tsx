"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ReviewActionDialog } from "@/app/admin/_components/ReviewActionDialog";
import { ActionToast, EmptyState, ErrorState, LoadingSkeleton, PageHeader, StatsCard, StatusBadge } from "@/app/components/dcreator/ui/base";

type ApiResult<T> = { success: boolean; data: T; error?: string };

type CreatorApplicationStatus = "DRAFT" | "PENDING_REVIEW" | "APPROVED" | "REJECTED" | "NEEDS_REVISION";

type CreatorApplicationRow = {
  id: string;
  status: CreatorApplicationStatus;
  displayName: string;
  mainPlatform: "TIKTOK" | "INSTAGRAM" | "YOUTUBE" | "FACEBOOK" | "OTHER";
  socialUrl: string;
  followerCount: number | null;
  contentCategory: string | null;
  bio: string | null;
  rejectReason: string | null;
  reviewNote: string | null;
  createdAt: string;
  account: {
    id: string;
    displayName: string;
    email: string;
  };
};

export function AccountRoleRequestsTab() {
  const [items, setItems] = useState<CreatorApplicationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<"newest" | "oldest">("newest");
  const [actingId, setActingId] = useState<string | null>(null);
  const [dialogAction, setDialogAction] = useState<null | "approve" | "reject">(null);
  const [targetId, setTargetId] = useState<string>("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      params.set("status", "PENDING_REVIEW");
      params.set("sort", sort);
      if (query.trim()) params.set("query", query.trim());

      const res = await fetch(`/api/admin/creators?${params.toString()}`, { cache: "no-store" });
      const body = (await res.json()) as ApiResult<CreatorApplicationRow[]>;
      if (!res.ok || !body.success) throw new Error(body.error ?? "Tải danh sách thất bại");
      setItems(body.data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Tải danh sách thất bại");
    } finally {
      setLoading(false);
    }
  }, [query, sort]);

  useEffect(() => {
    void load();
  }, [load]);

  const stats = useMemo(() => {
    const total = items.length;
    return { total, pending: total };
  }, [items]);

  async function approveRequest(requestId: string) {
    setActingId(requestId);
    setError("");
    try {
      const res = await fetch(`/api/admin/creators/${requestId}/approve`, { method: "PATCH" });
      const body = (await res.json()) as ApiResult<unknown>;
      if (!res.ok || !body.success) throw new Error(body.error ?? "Duyệt yêu cầu thất bại");
      setToast("Đã duyệt tài khoản Creator thành công");
      setTimeout(() => setToast(""), 1800);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Duyệt yêu cầu thất bại");
    } finally {
      setActingId(null);
    }
  }

  async function rejectRequest(requestId: string, reason: string) {
    setActingId(requestId);
    setError("");
    try {
      const res = await fetch(`/api/admin/creators/${requestId}/reject`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason })
      });
      const body = (await res.json()) as ApiResult<unknown>;
      if (!res.ok || !body.success) throw new Error(body.error ?? "Từ chối yêu cầu thất bại");
      setToast("Đã từ chối yêu cầu Creator");
      setTimeout(() => setToast(""), 1800);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Từ chối yêu cầu thất bại");
    } finally {
      setActingId(null);
    }
  }

  return (
    <section>
      <PageHeader
        title="Quản lý yêu cầu tài khoản Creator"
        subtitle="Quản lý các hồ sơ Creator từ bảng CreatorApplication. Khi duyệt sẽ nâng quyền Account và tạo CreatorProfile/CreatorSocialLink."
        action={
          <button className="dc-btn-secondary" type="button" onClick={() => void load()}>
            Làm mới
          </button>
        }
      />

      <section className="grid gap-3 sm:grid-cols-2">
        <StatsCard title="Tổng yêu cầu" value={String(stats.total)} />
        <StatsCard title="Đang chờ duyệt" value={String(stats.pending)} />
      </section>

      <section className="dc-card mt-4 p-4">
        <div className="grid gap-2 md:grid-cols-3">
          <input
            className="dc-input md:col-span-2"
            placeholder="Tìm tên, email, nền tảng, link mạng xã hội"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <select className="dc-input" value={sort} onChange={(e) => setSort(e.target.value as "newest" | "oldest")}>
            <option value="newest">Mới nhất</option>
            <option value="oldest">Cũ nhất</option>
          </select>
        </div>
      </section>

      {loading ? <div className="mt-4"><LoadingSkeleton rows={4} /></div> : null}
      {error ? <div className="mt-4"><ErrorState title="Không tải được yêu cầu tài khoản" description={error} onRetry={() => void load()} /></div> : null}
      {!loading && !error && items.length === 0 ? (
        <div className="mt-4">
          <EmptyState title="Không có yêu cầu" description="Không có hồ sơ Creator đang chờ duyệt." />
        </div>
      ) : null}

      {!loading && !error && items.length > 0 ? (
        <>
          <div className="mt-4 hidden overflow-x-auto rounded-2xl border border-zinc-200 bg-white lg:block">
            <table className="min-w-full text-sm">
              <thead className="bg-zinc-50 text-left text-zinc-600">
                <tr>
                  <th className="px-4 py-3">Tài khoản</th>
                  <th className="px-4 py-3">Hồ sơ Creator</th>
                  <th className="px-4 py-3">Thông tin social</th>
                  <th className="px-4 py-3">Ngày gửi</th>
                  <th className="px-4 py-3">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id} className="border-t border-zinc-100 align-top">
                    <td className="px-4 py-3">
                      <p className="font-semibold">{item.account.displayName}</p>
                      <p className="text-zinc-500">{item.account.email}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-semibold">{item.displayName}</p>
                      <p className="text-zinc-600">{item.contentCategory ?? "-"}</p>
                      <p className="text-zinc-600">{item.bio ?? "-"}</p>
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={item.status} />
                      <p className="mt-1 text-zinc-700">{item.mainPlatform}</p>
                      <p>Follower: {(item.followerCount ?? 0).toLocaleString("vi-VN")}</p>
                      <a href={item.socialUrl} target="_blank" rel="noreferrer" className="break-all text-blue-700 underline">{item.socialUrl}</a>
                    </td>
                    <td className="px-4 py-3">{new Date(item.createdAt).toLocaleString("vi-VN")}</td>
                    <td className="px-4 py-3">
                      <div className="grid gap-2">
                        <button
                          className="dc-btn-primary"
                          type="button"
                          disabled={actingId === item.id}
                          onClick={() => { setTargetId(item.id); setDialogAction("approve"); }}
                        >
                          {actingId === item.id ? "Đang xử lý..." : "Đồng ý"}
                        </button>
                        <button
                          className="dc-btn-secondary"
                          type="button"
                          disabled={actingId === item.id}
                          onClick={() => { setTargetId(item.id); setDialogAction("reject"); }}
                        >
                          {actingId === item.id ? "Đang xử lý..." : "Từ chối"}
                        </button>
                      </div>
                    </td>
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
                    <p className="font-semibold">{item.account.displayName}</p>
                    <p className="text-xs text-zinc-500">{item.account.email}</p>
                  </div>
                  <StatusBadge status={item.status} />
                </div>
                <p className="mt-2 text-sm">{item.displayName}</p>
                <p className="text-sm">{item.mainPlatform} • Follower {(item.followerCount ?? 0).toLocaleString("vi-VN")}</p>
                <a href={item.socialUrl} target="_blank" rel="noreferrer" className="mt-1 block break-all text-sm text-blue-700 underline">{item.socialUrl}</a>
                <p className="text-sm text-zinc-600">{new Date(item.createdAt).toLocaleString("vi-VN")}</p>
                <div className="mt-3 grid gap-2">
                  <button
                    className="dc-btn-primary"
                    type="button"
                    disabled={actingId === item.id}
                    onClick={() => { setTargetId(item.id); setDialogAction("approve"); }}
                  >
                    {actingId === item.id ? "Đang xử lý..." : "Đồng ý"}
                  </button>
                  <button
                    className="dc-btn-secondary"
                    type="button"
                    disabled={actingId === item.id}
                    onClick={() => { setTargetId(item.id); setDialogAction("reject"); }}
                  >
                    {actingId === item.id ? "Đang xử lý..." : "Từ chối"}
                  </button>
                </div>
              </article>
            ))}
          </div>
        </>
      ) : null}

      {toast ? <ActionToast message={toast} /> : null}
      <ReviewActionDialog
        open={dialogAction === "approve"}
        title="Duyệt tài khoản Creator"
        description="Yêu cầu sẽ chuyển sang approved và cập nhật role Creator."
        confirmLabel="Duyệt"
        submitting={actingId === targetId}
        onCancel={() => setDialogAction(null)}
        onConfirm={() => {
          setDialogAction(null);
          void approveRequest(targetId);
        }}
      />
      <ReviewActionDialog
        open={dialogAction === "reject"}
        title="Từ chối tài khoản Creator"
        description="Bắt buộc nhập lý do từ chối."
        confirmLabel="Từ chối"
        requireReason
        submitting={actingId === targetId}
        onCancel={() => setDialogAction(null)}
        onConfirm={(reason) => {
          setDialogAction(null);
          void rejectRequest(targetId, reason ?? "");
        }}
      />
    </section>
  );
}
