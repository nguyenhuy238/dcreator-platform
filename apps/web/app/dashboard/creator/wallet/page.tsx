"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { ActionToast, EmptyState, ErrorState, FormField, LoadingSkeleton, PageHeader, SectionHeader, StatusBadge, StatsCard } from "@/app/components/dcreator/ui/base";

type PayoutHistory = {
  id: string;
  amountVnd: number;
  status: "PENDING" | "APPROVED" | "PAID" | "REJECTED";
  note: string | null;
  createdAt: string;
  paidAt: string | null;
};

type PayoutData = { availableBalanceVnd: number; history: PayoutHistory[] };

type CommissionLine = {
  submissionId: string;
  missionId: string;
  missionTitle: string;
  fixedFeeVnd: number;
  salesCommissionVnd: number;
  payoutStatus: string;
};

type CommissionData = { lines: CommissionLine[]; payoutRequests: PayoutHistory[] };
type CreatorOverview = {
  totalCommission: number;
  nPointsBalance: number;
};
type CreatorMissionSummary = {
  status: string;
  completedAt: string | null;
  mission: {
    rewardPoints: number;
  };
};

type ApiResponse<T> = { success: boolean; data?: T; error?: string };

function formatVnd(value: number) {
  return `${value.toLocaleString("vi-VN")} VNĐ`;
}

function formatDate(value: string | null) {
  if (!value) return "-";
  return new Date(value).toLocaleString("vi-VN");
}

function buildPayoutReason(available: number) {
  if (available <= 0) return "Số dư khả dụng bằng 0.";
  if (available < 100000) return "Cần tối thiểu 100.000 VNĐ để gửi yêu cầu rút.";
  return "";
}

function onlyDigits(raw: string) {
  return raw.replace(/\D/g, "");
}

function parseNonNegativeInt(raw: string) {
  const digits = onlyDigits(raw);
  if (!digits) return 0;
  return Number.parseInt(digits, 10);
}

function formatIntForInput(value: number) {
  if (!Number.isFinite(value) || value <= 0) return "";
  return value.toLocaleString("vi-VN");
}

export default function CreatorWalletPage() {
  const [payout, setPayout] = useState<PayoutData | null>(null);
  const [commission, setCommission] = useState<CommissionData | null>(null);
  const [overview, setOverview] = useState<CreatorOverview | null>(null);
  const [missions, setMissions] = useState<CreatorMissionSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");

  const [amountVnd, setAmountVnd] = useState(100000);
  const [note, setNote] = useState("");

  async function load() {
    setLoading(true);
    setError("");
    try {
      const [payoutResponse, commissionResponse, overviewResponse, missionsResponse] = await Promise.all([
        fetch("/api/creator/dashboard/payouts", { cache: "no-store" }),
        fetch("/api/creator/dashboard/commission", { cache: "no-store" }),
        fetch("/api/creator/dashboard/overview", { cache: "no-store" }),
        fetch("/api/me/mission", { cache: "no-store" })
      ]);

      const payoutPayload = (await payoutResponse.json()) as ApiResponse<PayoutData>;
      const commissionPayload = (await commissionResponse.json()) as ApiResponse<CommissionData>;
      const overviewPayload = (await overviewResponse.json()) as ApiResponse<CreatorOverview>;
      const missionsPayload = (await missionsResponse.json()) as ApiResponse<CreatorMissionSummary[]>;

      if (!payoutResponse.ok || !payoutPayload.success || !payoutPayload.data) {
        throw new Error(payoutPayload.error ?? "Không thể tải ví Creator");
      }
      if (!commissionResponse.ok || !commissionPayload.success || !commissionPayload.data) {
        throw new Error(commissionPayload.error ?? "Không thể tải lịch sử hoa hồng");
      }
      if (!overviewResponse.ok || !overviewPayload.success || !overviewPayload.data) {
        throw new Error(overviewPayload.error ?? "Không thể tải tổng quan Creator");
      }
      if (!missionsResponse.ok || !missionsPayload.success || !missionsPayload.data) {
        throw new Error(missionsPayload.error ?? "Không thể tải nhiệm vụ Creator");
      }

      setPayout(payoutPayload.data);
      setCommission(commissionPayload.data);
      setOverview(overviewPayload.data);
      setMissions(missionsPayload.data);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Không thể tải ví Creator");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  const summary = useMemo(() => {
    const availablePoints = overview?.nPointsBalance ?? 0;
    const totalCommissionPoints = overview?.totalCommission ?? 0;
    const totalWithdrawnVnd = payout?.history.filter((item) => item.status === "PAID").reduce((sum, item) => sum + item.amountVnd, 0) ?? 0;

    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    const monthlyIncomePoints = missions
      .filter((item) => item.status === "COMPLETED" && item.completedAt)
      .filter((item) => {
        const completedAt = new Date(item.completedAt ?? "");
        return completedAt.getMonth() === currentMonth && completedAt.getFullYear() === currentYear;
      })
      .reduce((sum, item) => sum + (item.mission.rewardPoints ?? 0), 0);

    return { availablePoints, totalCommissionPoints, monthlyIncomePoints, totalWithdrawnVnd };
  }, [missions, overview?.nPointsBalance, overview?.totalCommission, payout?.history]);

  const payoutReason = buildPayoutReason(payout?.availableBalanceVnd ?? 0);
  const canRequestPayout = payoutReason.length === 0;

  async function onRequestPayout(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canRequestPayout) return;

    setSubmitting(true);
    setError("");
    try {
      const response = await fetch("/api/creator/dashboard/payouts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amountVnd,
          note: note.trim() || undefined,
          idempotencyKey: `payout_${Date.now()}`
        })
      });
      const payload = (await response.json()) as ApiResponse<unknown>;
      if (!response.ok || !payload.success) {
        throw new Error(payload.error ?? "Không thể gửi yêu cầu rút tiền");
      }
      setToast("Đã gửi yêu cầu rút tiền thành công.");
      setTimeout(() => setToast(""), 2400);
      setNote("");
      await load();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Không thể gửi yêu cầu rút tiền");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <PageHeader title="Ví Creator" subtitle="Quản lý số dư, hoa hồng và các yêu cầu payout của bạn." />

      {error ? <ErrorState title="Không thể tải ví" description={error} onRetry={() => void load()} /> : null}
      {loading ? <LoadingSkeleton rows={5} /> : null}

      {!loading && payout && commission ? (
        <>
          <section className="dc-grid-dashboard">
            <StatsCard title="Số dư khả dụng" value={`${summary.availablePoints.toLocaleString("vi-VN")} N-Points`} />
            <StatsCard title="Số hoa hồng đã nhận" value={`${summary.totalCommissionPoints.toLocaleString("vi-VN")} N-Points`} />
            <StatsCard title="Thu nhập tháng này" value={`${summary.monthlyIncomePoints.toLocaleString("vi-VN")} N-Points`} />
            <StatsCard title="Tổng đã rút" value={formatVnd(summary.totalWithdrawnVnd)} />
          </section>

          <section className="mt-6 grid gap-4 xl:grid-cols-[1.2fr_1fr]">
            <article className="dc-card p-4">
              <SectionHeader title="Yêu cầu rút tiền" subtitle="Tạo yêu cầu payout khi số dư đủ điều kiện." />
              <p className="mb-3 text-sm text-zinc-600">Thông tin nhận tiền: <span className="font-semibold text-zinc-900">Chưa cấu hình</span>. <Link className="underline" href="/dashboard/creator/profile">Cập nhật thông tin thanh toán</Link></p>
              {!canRequestPayout ? <p className="mb-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700">{payoutReason}</p> : null}

              <form className="grid gap-3" onSubmit={onRequestPayout}>
                <FormField label="Số tiền muốn rút (VNĐ)">
                  <>
                    <input className="dc-input" type="text" inputMode="numeric" placeholder="100.000" value={formatIntForInput(amountVnd)} onChange={(event) => setAmountVnd(parseNonNegativeInt(event.target.value))} />
                    <p className="text-xs font-medium text-zinc-500">Đơn vị: VND, tối thiểu 100.000 VND mỗi lần rút.</p>
                  </>
                </FormField>
                <FormField label="Ghi chú (tuỳ chọn)">
                  <textarea className="dc-input min-h-24" value={note} onChange={(event) => setNote(event.target.value)} placeholder="Ví dụ: rút đợt 1 tháng này" />
                </FormField>
                <div className="flex gap-2">
                  <button type="submit" className="dc-btn-primary" disabled={!canRequestPayout || submitting}>{submitting ? "Đang gửi..." : "Yêu cầu rút tiền"}</button>
                </div>
              </form>
            </article>

            <article className="dc-card p-4">
              <SectionHeader title="Lịch sử payout" subtitle={`${payout.history.length} giao dịch`} />
              {payout.history.length === 0 ? (
                <EmptyState title="Chưa có giao dịch payout" description="Các yêu cầu rút tiền sẽ xuất hiện tại đây." />
              ) : (
                <>
                  <div className="grid gap-2 md:hidden">
                    {payout.history.map((tx) => (
                      <div key={tx.id} className="rounded-2xl border border-zinc-200 bg-zinc-50 p-3">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-sm font-semibold text-zinc-900">{formatVnd(tx.amountVnd)}</p>
                          <StatusBadge status={tx.status} />
                        </div>
                        <p className="mt-1 text-xs text-zinc-500">Ngày tạo: {formatDate(tx.createdAt)}</p>
                        <p className="text-xs text-zinc-500">Ngày chi trả: {formatDate(tx.paidAt)}</p>
                        {tx.note ? <p className="mt-1 text-sm text-zinc-600">{tx.note}</p> : null}
                      </div>
                    ))}
                  </div>
                  <div className="hidden overflow-x-auto rounded-2xl border border-zinc-200 md:block">
                    <table className="min-w-full text-sm">
                      <thead className="bg-zinc-100 text-zinc-700">
                        <tr>
                          <th className="px-3 py-2 text-left">Ngày giao dịch</th>
                          <th className="px-3 py-2 text-left">Loại</th>
                          <th className="px-3 py-2 text-left">Số tiền</th>
                          <th className="px-3 py-2 text-left">Trạng thái</th>
                          <th className="px-3 py-2 text-left">Ghi chú</th>
                        </tr>
                      </thead>
                      <tbody>
                        {payout.history.map((tx) => (
                          <tr key={tx.id} className="border-t border-zinc-200 bg-white">
                            <td className="px-3 py-2">{formatDate(tx.createdAt)}</td>
                            <td className="px-3 py-2">Payout</td>
                            <td className="px-3 py-2 font-semibold text-zinc-900">{formatVnd(tx.amountVnd)}</td>
                            <td className="px-3 py-2"><StatusBadge status={tx.status} /></td>
                            <td className="px-3 py-2 text-zinc-600">{tx.note ?? "-"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </article>
          </section>

          <section className="mt-6">
            <SectionHeader title="Lịch sử hoa hồng trò chơi" subtitle={`${commission.lines.length} bản ghi`} />
            {commission.lines.length === 0 ? (
              <EmptyState title="Chưa có thu nhập" description="Hoa hồng campaign sẽ xuất hiện khi nhiệm vụ được duyệt và ghi nhận payout." />
            ) : (
              <>
                <div className="grid gap-3 lg:hidden">
                  {commission.lines.map((line) => (
                    <article key={line.submissionId} className="dc-card p-4">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <p className="font-semibold text-zinc-900">{line.missionTitle}</p>
                          <p className="text-sm text-zinc-600">Mã nhiệm vụ: {line.missionId}</p>
                        </div>
                        <StatusBadge status={line.payoutStatus.toUpperCase()} />
                      </div>
                      <div className="mt-2 grid gap-1 text-sm text-zinc-600">
                        <p>Hoa hồng campaign: <span className="font-semibold text-zinc-900">{formatVnd(line.fixedFeeVnd)}</span></p>
                        <p>Bonus/affiliate: <span className="font-semibold text-zinc-900">{formatVnd(line.salesCommissionVnd)}</span></p>
                      </div>
                    </article>
                  ))}
                </div>
                <div className="hidden overflow-x-auto rounded-2xl border border-zinc-200 lg:block">
                  <table className="min-w-full text-sm">
                    <thead className="bg-zinc-100 text-zinc-700">
                      <tr>
                        <th className="px-3 py-2 text-left">Nhiệm vụ</th>
                        <th className="px-3 py-2 text-left">Loại giao dịch</th>
                        <th className="px-3 py-2 text-left">Số tiền</th>
                        <th className="px-3 py-2 text-left">Trạng thái</th>
                      </tr>
                    </thead>
                    <tbody>
                      {commission.lines.map((line) => (
                        <tr key={line.submissionId} className="border-t border-zinc-200 bg-white">
                          <td className="px-3 py-2">
                            <p className="font-semibold text-zinc-900">{line.missionTitle}</p>
                            <p className="text-xs text-zinc-500">{line.missionId}</p>
                          </td>
                          <td className="px-3 py-2">Hoa hồng campaign</td>
                          <td className="px-3 py-2 font-semibold text-zinc-900">{formatVnd(line.fixedFeeVnd + line.salesCommissionVnd)}</td>
                          <td className="px-3 py-2"><StatusBadge status={line.payoutStatus.toUpperCase()} /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </section>
        </>
      ) : null}

      {toast ? <ActionToast message={toast} /> : null}
    </>
  );
}
