"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { PayoutDetailModal, type PayoutModalCreator, type PayoutModalData } from "@/app/components/dcreator/ui/PayoutDetailModal";
import { ActionToast, EmptyState, ErrorState, LoadingSkeleton, PageHeader, StatusBadge } from "@/app/components/dcreator/ui/base";

type ApiResult<T> = { success: boolean; data?: T; error?: string };
type FilterKey = "PENDING" | "PAID" | "REJECTED";

type PayoutStatus = "PENDING" | "APPROVED" | "PAID" | "REJECTED";

type PayoutListItem = {
  id: string;
  amountVnd: number;
  status: PayoutStatus;
  note: string | null;
  createdAt: string;
  paidAt: string | null;
  bankName: string;
  bankAccountName: string;
  bankAccountNumber: string;
  account: { id: string; displayName: string; email: string };
};

type PayoutDetailResponse = {
  id: string;
  amountVnd: number;
  status: PayoutStatus;
  note: string | null;
  createdAt: string;
  reviewedAt: string | null;
  paidAt: string | null;
  bankName: string;
  bankCode: string | null;
  bankBin: string | null;
  bankAccountName: string;
  bankAccountNumber: string;
  account: {
    displayName: string;
    email: string;
    creatorProfile: {
      mainPlatform: string | null;
      socialUrl: string | null;
      followerCount: number | null;
    } | null;
  };
};

type PayoutDetail = PayoutModalData & {
  creator: PayoutModalCreator;
};

const filters: Array<{ key: FilterKey; label: string }> = [
  { key: "PENDING", label: "Đang chờ" },
  { key: "PAID", label: "Đã thanh toán" },
  { key: "REJECTED", label: "Đã từ chối" }
];

function formatMoney(value: number) {
  return `${value.toLocaleString("vi-VN")} VND`;
}

function formatDateTime(value: string | null) {
  if (!value) return "-";
  return new Date(value).toLocaleString("vi-VN");
}

function maskAccountNumber(value: string) {
  if (value.length <= 4) return value;
  return `${"*".repeat(Math.max(0, value.length - 4))}${value.slice(-4)}`;
}

function isWaitingStatus(status: PayoutStatus) {
  return status === "PENDING" || status === "APPROVED";
}

function mapDetail(payload: PayoutDetailResponse): PayoutDetail {
  return {
    id: payload.id,
    amountVnd: payload.amountVnd,
    status: payload.status,
    note: payload.note,
    createdAt: payload.createdAt,
    reviewedAt: payload.reviewedAt,
    paidAt: payload.paidAt,
    bankName: payload.bankName,
    bankCode: payload.bankCode,
    bankBin: payload.bankBin,
    bankAccountName: payload.bankAccountName,
    bankAccountNumber: payload.bankAccountNumber,
    creator: {
      displayName: payload.account.displayName,
      email: payload.account.email,
      mainPlatform: payload.account.creatorProfile?.mainPlatform ?? null,
      socialUrl: payload.account.creatorProfile?.socialUrl ?? null,
      followerCount: payload.account.creatorProfile?.followerCount ?? null
    }
  };
}

export default function AdminPayoutsPage() {
  const [filter, setFilter] = useState<FilterKey>("PENDING");
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");
  const [items, setItems] = useState<PayoutListItem[]>([]);
  const [actingId, setActingId] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedDetail, setSelectedDetail] = useState<PayoutDetail | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({ status: filter });
      const response = await fetch(`/api/admin/payouts?${params.toString()}`, { cache: "no-store" });
      const payload = (await response.json()) as ApiResult<PayoutListItem[]>;
      if (!response.ok || !payload.success || !payload.data) {
        throw new Error(payload.error ?? "Không thể tải danh sách yêu cầu rút tiền.");
      }
      setItems(payload.data);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Không thể tải danh sách yêu cầu rút tiền.");
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    void load();
  }, [load]);

  const selectedListItem = useMemo(
    () => items.find((item) => item.id === selectedId) ?? null,
    [items, selectedId]
  );

  async function fetchDetail(payoutId: string) {
    const response = await fetch(`/api/admin/payouts/${payoutId}`, { cache: "no-store" });
    const payload = (await response.json()) as ApiResult<PayoutDetailResponse>;
    if (!response.ok || !payload.success || !payload.data) {
      throw new Error(payload.error ?? "Không thể tải chi tiết yêu cầu rút tiền.");
    }
    return mapDetail(payload.data);
  }

  async function openDetail(item: PayoutListItem) {
    setSelectedId(item.id);
    setDetailLoading(true);
    setError("");

    try {
      const detail = await fetchDetail(item.id);
      setSelectedDetail(detail);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Không thể tải chi tiết yêu cầu rút tiền.");
      setSelectedId(null);
      setSelectedDetail(null);
    } finally {
      setDetailLoading(false);
    }
  }

  function closeDetail() {
    if (actingId) return;
    setSelectedId(null);
    setSelectedDetail(null);
  }

  async function markAsPaid() {
    if (!selectedDetail) return;

    setActingId(selectedDetail.id);
    setError("");
    try {
      const latest = await fetchDetail(selectedDetail.id);
      setSelectedDetail(latest);

      if (latest.status === "PAID") {
        throw new Error("Yêu cầu này đã được đánh dấu là đã thanh toán.");
      }
      if (latest.status === "REJECTED") {
        throw new Error("Yêu cầu này đã bị từ chối, không thể đánh dấu đã thanh toán.");
      }

      const paidResponse = await fetch(`/api/admin/payouts/${latest.id}/mark-paid`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({})
      });
      const paidPayload = (await paidResponse.json()) as ApiResult<unknown>;
      if (!paidResponse.ok || !paidPayload.success) {
        throw new Error(paidPayload.error ?? "Không thể xác nhận đã thanh toán.");
      }

      setToast("Đã cập nhật trạng thái thanh toán.");
      setTimeout(() => setToast(""), 2200);
      setSelectedId(null);
      setSelectedDetail(null);
      await load();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Không thể xác nhận đã thanh toán.");
    } finally {
      setActingId("");
    }
  }

  async function rejectSelected() {
    if (!selectedDetail) return;

    const reason = window.prompt("Nhập lý do từ chối để Creator nhìn thấy:", selectedDetail.note ?? "");
    if (reason === null) return;

    const trimmedReason = reason.trim();
    if (trimmedReason.length < 5) {
      window.alert("Lý do từ chối cần tối thiểu 5 ký tự.");
      return;
    }

    setActingId(selectedDetail.id);
    setError("");
    try {
      const latest = await fetchDetail(selectedDetail.id);
      setSelectedDetail(latest);

      if (latest.status === "PAID") {
        throw new Error("Yêu cầu này đã được thanh toán, không thể từ chối.");
      }
      if (latest.status === "REJECTED") {
        throw new Error("Yêu cầu này đã bị từ chối trước đó.");
      }

      const response = await fetch(`/api/admin/payouts/${latest.id}/reject`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: trimmedReason })
      });
      const payload = (await response.json()) as ApiResult<unknown>;
      if (!response.ok || !payload.success) {
        throw new Error(payload.error ?? "Không thể từ chối yêu cầu rút tiền.");
      }

      setToast("Đã từ chối yêu cầu rút tiền.");
      setTimeout(() => setToast(""), 2200);
      setSelectedId(null);
      setSelectedDetail(null);
      await load();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Không thể từ chối yêu cầu rút tiền.");
    } finally {
      setActingId("");
    }
  }

  return (
    <>
      <PageHeader
        title="Rút tiền Creator"
        subtitle="Theo dõi yêu cầu rút tiền và xác nhận chuyển khoản ngay trong một màn hình."
        action={
          <button className="dc-btn-secondary" onClick={() => void load()}>
            Làm mới
          </button>
        }
      />

      <section className="mb-4 flex flex-wrap gap-2">
        {filters.map((item) => (
          <button
            key={item.key}
            type="button"
            className={
              filter === item.key
                ? "rounded-full bg-zinc-900 px-4 py-2 text-sm font-semibold text-white"
                : "rounded-full border border-zinc-200 bg-white px-4 py-2 text-sm font-semibold text-zinc-600 transition hover:bg-zinc-50"
            }
            onClick={() => setFilter(item.key)}
          >
            {item.label}
          </button>
        ))}
      </section>

      {loading ? <LoadingSkeleton rows={5} /> : null}
      {error ? <ErrorState title="Không thể tải yêu cầu rút tiền" description={error} onRetry={() => void load()} /> : null}

      {!loading && !error ? (
        items.length === 0 ? (
          <EmptyState
            title="Chưa có yêu cầu phù hợp"
            description="Danh sách rút tiền đang trống theo nhóm trạng thái bạn đang xem."
          />
        ) : (
          <div className="grid gap-3">
            {items.map((item) => (
              <article key={item.id} className="relative rounded-[28px] border border-zinc-200 bg-white p-4 shadow-sm">
                <div className="absolute right-4 top-4">
                  <StatusBadge status={item.status} />
                </div>

                <div className="grid gap-2 pr-28">
                  <div className="grid gap-1">
                    <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Creator</p>
                    <p className="text-sm font-semibold text-zinc-900">{item.account.displayName}</p>
                    <p className="text-sm text-zinc-600">{item.account.email}</p>
                  </div>

                  <div className="grid gap-1">
                    <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Số tiền</p>
                    <p className="text-sm font-semibold text-zinc-900">{formatMoney(item.amountVnd)}</p>
                  </div>

                  <div className="grid gap-1 md:grid-cols-2 md:gap-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Ngày tạo</p>
                      <p className="text-sm text-zinc-700">{formatDateTime(item.createdAt)}</p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Ngày thanh toán</p>
                      <p className="text-sm text-zinc-700">{formatDateTime(item.paidAt)}</p>
                    </div>
                  </div>

                  <div className="grid gap-1">
                    <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Ngân hàng nhận</p>
                    <p className="text-sm text-zinc-700">{item.bankName}</p>
                    <p className="text-sm text-zinc-600">{item.bankAccountName} • {maskAccountNumber(item.bankAccountNumber)}</p>
                  </div>

                  <div className="grid gap-1">
                    <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Ghi chú</p>
                    <p className="text-sm text-zinc-700">{item.note ?? "-"}</p>
                  </div>
                </div>

                <div className="mt-4 flex justify-end">
                  <button type="button" className="dc-btn-primary" onClick={() => void openDetail(item)}>
                    {isWaitingStatus(item.status) ? "Thao tác" : "Xem chi tiết"}
                  </button>
                </div>
              </article>
            ))}
          </div>
        )
      ) : null}

      <PayoutDetailModal
        open={Boolean(selectedId)}
        title={detailLoading ? "Đang tải chi tiết..." : "Chi tiết yêu cầu rút tiền"}
        subtitle={
          selectedDetail
            ? `Số tiền: ${formatMoney(selectedDetail.amountVnd)}`
            : selectedListItem
              ? `Số tiền: ${formatMoney(selectedListItem.amountVnd)}`
              : "Đang tải dữ liệu yêu cầu rút tiền."
        }
        payout={selectedDetail}
        creator={selectedDetail?.creator ?? null}
        onClose={closeDetail}
        actions={
          selectedDetail && isWaitingStatus(selectedDetail.status) ? (
            <>
              <button
                type="button"
                className="dc-btn-secondary"
                disabled={actingId === selectedDetail.id}
                onClick={() => void rejectSelected()}
              >
                Từ chối
              </button>
              <button
                type="button"
                className="dc-btn-primary"
                disabled={actingId === selectedDetail.id}
                onClick={() => void markAsPaid()}
              >
                {actingId === selectedDetail.id ? "Đang xử lý..." : "Đã thanh toán"}
              </button>
            </>
          ) : null
        }
      />

      {Boolean(selectedId) && detailLoading ? (
        <ActionToast title="Đang tải chi tiết yêu cầu rút tiền" tone="loading" onClose={closeDetail} />
      ) : null}

      {toast ? <ActionToast message={toast} onClose={() => setToast("")} /> : null}
    </>
  );
}
