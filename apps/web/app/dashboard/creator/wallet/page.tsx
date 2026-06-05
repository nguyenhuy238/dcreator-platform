"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { PayoutDetailModal, type PayoutModalCreator } from "@/app/components/dcreator/ui/PayoutDetailModal";
import {
  ActionToast,
  ConfirmDialog,
  EmptyState,
  ErrorState,
  FormField,
  LoadingSkeleton,
  PageHeader,
  SectionHeader,
  StatusBadge,
  StatsCard
} from "@/app/components/dcreator/ui/base";

type PayoutHistory = {
  id: string;
  amountVnd: number;
  status: "PENDING" | "APPROVED" | "PAID" | "REJECTED";
  note: string | null;
  createdAt: string;
  reviewedAt: string | null;
  paidAt: string | null;
  bankName: string;
  bankCode: string | null;
  bankBin: string | null;
  bankAccountName: string;
  bankAccountNumber: string;
};

type CreatorBankAccount = {
  id: string;
  bankName: string;
  bankCode: string | null;
  bankBin: string | null;
  accountNumber: string;
  accountHolderName: string;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
};

type VietQrBank = {
  id: number;
  name: string;
  code: string;
  bin: string;
  shortName: string;
  logo: string;
  lookupSupported: boolean;
};

type PayoutData = {
  creator: PayoutModalCreator;
  availableBalanceVnd: number;
  pendingPayoutVnd: number;
  withdrawnPayoutVnd: number;
  history: PayoutHistory[];
  bankAccounts: CreatorBankAccount[];
};

type ApiResponse<T> = { success: boolean; data?: T; error?: string };

type BankForm = {
  bankCode: string;
  accountNumber: string;
  accountHolderName: string;
};

const emptyBankForm: BankForm = {
  bankCode: "",
  accountNumber: "",
  accountHolderName: ""
};

function formatPoints(value: number) {
  return `${value.toLocaleString("vi-VN")} N-Point`;
}

function formatDate(value: string | null) {
  if (!value) return "-";
  return new Date(value).toLocaleString("vi-VN");
}

function buildPayoutReason(available: number, hasSelectedBank: boolean) {
  if (!hasSelectedBank) return "Vui lòng chọn tài khoản ngân hàng trước khi gửi yêu cầu rút tiền.";
  if (available <= 0) return "Số dư khả dụng bằng 0.";
  if (available < 100000) return "Cần tối thiểu 100.000 N-Point để gửi yêu cầu rút.";
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

function maskAccountNumber(value: string) {
  if (value.length <= 4) return value;
  return `${"*".repeat(Math.max(0, value.length - 4))}${value.slice(-4)}`;
}

export default function CreatorWalletPage() {
  const [payout, setPayout] = useState<PayoutData | null>(null);
  const [vietQrBanks, setVietQrBanks] = useState<VietQrBank[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [savingBank, setSavingBank] = useState(false);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");
  const [amountVnd, setAmountVnd] = useState(100000);
  const [note, setNote] = useState("");
  const [bankForm, setBankForm] = useState<BankForm>(emptyBankForm);
  const [editingBankId, setEditingBankId] = useState<string | null>(null);
  const [deleteBankId, setDeleteBankId] = useState<string | null>(null);
  const [selectedHistoryId, setSelectedHistoryId] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError("");
    try {
      const [payoutResponse, banksResponse] = await Promise.all([
        fetch("/api/creator/dashboard/payouts", { cache: "no-store" }),
        fetch("/api/vietqr/banks", { cache: "no-store" })
      ]);

      const payoutPayload = (await payoutResponse.json()) as ApiResponse<PayoutData>;
      const banksPayload = (await banksResponse.json()) as ApiResponse<VietQrBank[]>;

      if (!payoutResponse.ok || !payoutPayload.success || !payoutPayload.data) {
        throw new Error(payoutPayload.error ?? "Không thể tải ví Creator");
      }
      if (!banksResponse.ok || !banksPayload.success || !banksPayload.data) {
        throw new Error(banksPayload.error ?? "Không thể tải danh sách ngân hàng Việt Nam");
      }

      setPayout(payoutPayload.data);
      setVietQrBanks(banksPayload.data);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Không thể tải ví Creator");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  const selectedBank = useMemo(
    () => payout?.bankAccounts.find((item) => item.isDefault) ?? null,
    [payout?.bankAccounts]
  );

  const selectedBankOption = useMemo(
    () => vietQrBanks.find((item) => item.code === bankForm.bankCode) ?? null,
    [bankForm.bankCode, vietQrBanks]
  );

  const selectedHistory = useMemo(
    () => payout?.history.find((item) => item.id === selectedHistoryId) ?? null,
    [payout?.history, selectedHistoryId]
  );

  const payoutReason = buildPayoutReason(payout?.availableBalanceVnd ?? 0, Boolean(selectedBank));
  const canRequestPayout = payoutReason.length === 0;

  async function onRequestPayout(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canRequestPayout || !selectedBank) return;

    setSubmitting(true);
    setError("");
    try {
      const response = await fetch("/api/creator/dashboard/payouts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amountVnd,
          creatorBankAccountId: selectedBank.id,
          note: note.trim() || undefined,
          idempotencyKey: `payout_${Date.now()}`
        })
      });
      const payload = (await response.json()) as ApiResponse<unknown>;
      if (!response.ok || !payload.success) {
        throw new Error(payload.error ?? "Không thể gửi yêu cầu rút tiền");
      }
      setToast("Đã gửi yêu cầu rút N-Point thành công.");
      setTimeout(() => setToast(""), 2400);
      setNote("");
      await load();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Không thể gửi yêu cầu rút tiền");
    } finally {
      setSubmitting(false);
    }
  }

  async function saveBankAccount(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedBankOption) return;

    setSavingBank(true);
    setError("");
    try {
      const endpoint = editingBankId
        ? `/api/creator/dashboard/bank-accounts/${editingBankId}`
        : "/api/creator/dashboard/bank-accounts";
      const method = editingBankId ? "PATCH" : "POST";

      const response = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bankName: selectedBankOption.name,
          bankCode: selectedBankOption.code,
          bankBin: selectedBankOption.bin,
          accountNumber: bankForm.accountNumber.trim(),
          accountHolderName: bankForm.accountHolderName.trim()
        })
      });
      const payload = (await response.json()) as ApiResponse<CreatorBankAccount[]>;
      if (!response.ok || !payload.success || !payload.data) {
        throw new Error(payload.error ?? "Không thể lưu tài khoản ngân hàng");
      }

      setPayout((current) => (current ? { ...current, bankAccounts: payload.data ?? [] } : current));
      setBankForm(emptyBankForm);
      setEditingBankId(null);
      setToast(editingBankId ? "Đã cập nhật tài khoản ngân hàng." : "Đã thêm tài khoản ngân hàng.");
      setTimeout(() => setToast(""), 2200);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Không thể lưu tài khoản ngân hàng");
    } finally {
      setSavingBank(false);
    }
  }

  function startEditBankAccount(bankAccount: CreatorBankAccount) {
    setEditingBankId(bankAccount.id);
    setBankForm({
      bankCode: bankAccount.bankCode ?? "",
      accountNumber: bankAccount.accountNumber,
      accountHolderName: bankAccount.accountHolderName
    });
  }

  async function setDefaultBankAccount(bankAccountId: string) {
    setSavingBank(true);
    setError("");
    try {
      const response = await fetch(`/api/creator/dashboard/bank-accounts/${bankAccountId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isDefault: true })
      });
      const payload = (await response.json()) as ApiResponse<CreatorBankAccount[]>;
      if (!response.ok || !payload.success || !payload.data) {
        throw new Error(payload.error ?? "Không thể chọn tài khoản mặc định");
      }
      setPayout((current) => (current ? { ...current, bankAccounts: payload.data ?? [] } : current));
      setToast("Đã chọn tài khoản nhận tiền.");
      setTimeout(() => setToast(""), 2200);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Không thể chọn tài khoản mặc định");
    } finally {
      setSavingBank(false);
    }
  }

  async function deleteBankAccount() {
    if (!deleteBankId) return;
    setSavingBank(true);
    setError("");
    try {
      const response = await fetch(`/api/creator/dashboard/bank-accounts/${deleteBankId}`, {
        method: "DELETE"
      });
      const payload = (await response.json()) as ApiResponse<CreatorBankAccount[]>;
      if (!response.ok || !payload.success || !payload.data) {
        throw new Error(payload.error ?? "Không thể xoá tài khoản ngân hàng");
      }
      setPayout((current) => (current ? { ...current, bankAccounts: payload.data ?? [] } : current));
      setDeleteBankId(null);
      if (editingBankId === deleteBankId) {
        setEditingBankId(null);
        setBankForm(emptyBankForm);
      }
      setToast("Đã xoá tài khoản ngân hàng.");
      setTimeout(() => setToast(""), 2200);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Không thể xoá tài khoản ngân hàng");
    } finally {
      setSavingBank(false);
    }
  }

  return (
    <>
      <PageHeader
        title="Ví Creator"
        subtitle="Quản lý số dư N-Point, tài khoản ngân hàng và các yêu cầu rút tiền của bạn."
      />

      {error ? <ErrorState title="Không thể tải ví" description={error} onRetry={() => void load()} /> : null}
      {loading ? <LoadingSkeleton rows={4} /> : null}

      {!loading && payout ? (
        <>
          <section className="dc-grid-dashboard">
            <StatsCard title="Số dư khả dụng" value={formatPoints(payout.availableBalanceVnd)} />
            <StatsCard title="Tổng chờ rút" value={formatPoints(payout.pendingPayoutVnd)} />
            <StatsCard title="Tổng đã rút" value={formatPoints(payout.withdrawnPayoutVnd)} />
          </section>

          <section className="mt-6 grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
            <article className="dc-card p-4">
              <SectionHeader
                title="Yêu cầu rút tiền"
                subtitle="Chọn tài khoản nhận tiền và gửi yêu cầu rút N-Point khi đủ điều kiện."
              />
              {!canRequestPayout ? (
                <p className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700">
                  {payoutReason}
                </p>
              ) : null}

              <form className="grid gap-3" onSubmit={onRequestPayout}>
                <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-3">
                  <p className="text-xs uppercase tracking-wide text-zinc-500">Tài khoản nhận tiền</p>
                  {selectedBank ? (
                    <div className="mt-1">
                      <p className="font-semibold text-zinc-900">{selectedBank.bankName}</p>
                      <p className="text-sm text-zinc-600">{selectedBank.accountHolderName}</p>
                      <p className="text-sm text-zinc-500">{maskAccountNumber(selectedBank.accountNumber)}</p>
                    </div>
                  ) : (
                    <p className="mt-1 text-sm text-zinc-600">Chưa có tài khoản nào được chọn.</p>
                  )}
                </div>

                <FormField label="Số N-Point muốn rút">
                  <>
                    <input
                      className="dc-input"
                      type="text"
                      inputMode="numeric"
                      placeholder="100.000"
                      value={formatIntForInput(amountVnd)}
                      onChange={(event) => setAmountVnd(parseNonNegativeInt(event.target.value))}
                    />
                    <p className="text-xs font-medium text-zinc-500">
                      Tỷ lệ quy đổi: 1 N-Point = 1 VNĐ. Tối thiểu 100.000 N-Point mỗi lần rút.
                    </p>
                  </>
                </FormField>

                <FormField label="Ghi chú (tuỳ chọn)">
                  <textarea
                    className="dc-input min-h-20"
                    value={note}
                    onChange={(event) => setNote(event.target.value)}
                    placeholder="Ví dụ: rút đợt 1 tháng này"
                  />
                </FormField>

                <div className="flex gap-2">
                  <button type="submit" className="dc-btn-primary" disabled={!canRequestPayout || submitting}>
                    {submitting ? "Đang gửi..." : "Yêu cầu rút N-Point"}
                  </button>
                </div>
              </form>
            </article>

            <article className="dc-card p-4">
              <SectionHeader title="Tài khoản ngân hàng" subtitle={`${payout.bankAccounts.length} tài khoản`} />

              <form className="grid gap-3" onSubmit={saveBankAccount}>
                <FormField label="Ngân hàng">
                  <select
                    className="dc-input"
                    value={bankForm.bankCode}
                    onChange={(event) => setBankForm((current) => ({ ...current, bankCode: event.target.value }))}
                  >
                    <option value="">Chọn ngân hàng từ VietQR</option>
                    {vietQrBanks.map((bank) => (
                      <option key={bank.code} value={bank.code}>
                        {bank.shortName} - {bank.name}
                      </option>
                    ))}
                  </select>
                </FormField>

                {selectedBankOption ? (
                  <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-3">
                    <div className="flex items-center gap-3">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={selectedBankOption.logo}
                        alt={selectedBankOption.shortName}
                        className="h-10 w-10 rounded-xl border border-zinc-200 bg-white object-contain p-1"
                      />
                      <div>
                        <p className="font-semibold text-zinc-900">{selectedBankOption.shortName}</p>
                        <p className="text-sm text-zinc-600">{selectedBankOption.name}</p>
                        <p className="text-xs text-zinc-500">BIN / acqId: {selectedBankOption.bin}</p>
                      </div>
                    </div>
                  </div>
                ) : null}

                <div className="grid gap-3 md:grid-cols-2">
                  <FormField label="Số tài khoản">
                    <input
                      className="dc-input"
                      value={bankForm.accountNumber}
                      onChange={(event) => setBankForm((current) => ({ ...current, accountNumber: event.target.value }))}
                      placeholder="Nhập số tài khoản"
                    />
                  </FormField>
                  <FormField label="Tên chủ tài khoản">
                    <input
                      className="dc-input"
                      value={bankForm.accountHolderName}
                      onChange={(event) => setBankForm((current) => ({ ...current, accountHolderName: event.target.value }))}
                      placeholder="Nguyen Van A"
                    />
                  </FormField>
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    type="submit"
                    className="dc-btn-primary"
                    disabled={
                      savingBank ||
                      bankForm.bankCode.trim().length === 0 ||
                      bankForm.accountNumber.trim().length === 0 ||
                      bankForm.accountHolderName.trim().length === 0
                    }
                  >
                    {savingBank ? "Đang lưu..." : editingBankId ? "Cập nhật tài khoản" : "Thêm tài khoản"}
                  </button>
                  {editingBankId ? (
                    <button
                      type="button"
                      className="dc-btn-secondary"
                      disabled={savingBank}
                      onClick={() => {
                        setEditingBankId(null);
                        setBankForm(emptyBankForm);
                      }}
                    >
                      Huỷ chỉnh sửa
                    </button>
                  ) : null}
                </div>
              </form>

              {payout.bankAccounts.length === 0 ? (
                <div className="mt-4">
                  <EmptyState
                    title="Chưa có tài khoản ngân hàng"
                    description="Thêm ít nhất một tài khoản để có thể nhận tiền rút."
                  />
                </div>
              ) : (
                <div className="mt-4 grid gap-3">
                  {payout.bankAccounts.map((bankAccount) => (
                    <article key={bankAccount.id} className="rounded-2xl border border-zinc-200 bg-zinc-50 p-3">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <p className="font-semibold text-zinc-900">{bankAccount.bankName}</p>
                          <p className="text-sm text-zinc-600">{bankAccount.accountHolderName}</p>
                          <p className="text-sm text-zinc-500">{maskAccountNumber(bankAccount.accountNumber)}</p>
                          {bankAccount.bankBin ? (
                            <p className="text-xs text-zinc-500">BIN / acqId: {bankAccount.bankBin}</p>
                          ) : null}
                        </div>
                        {bankAccount.isDefault ? (
                          <span className="rounded-full bg-zinc-900 px-3 py-1 text-xs font-semibold text-white">
                            Đang chọn
                          </span>
                        ) : null}
                      </div>

                      <div className="mt-3 flex flex-wrap gap-2">
                        {!bankAccount.isDefault ? (
                          <button
                            type="button"
                            className="dc-btn-primary"
                            disabled={savingBank}
                            onClick={() => void setDefaultBankAccount(bankAccount.id)}
                          >
                            Chọn nhận tiền
                          </button>
                        ) : null}
                        <button
                          type="button"
                          className="dc-btn-secondary"
                          disabled={savingBank}
                          onClick={() => startEditBankAccount(bankAccount)}
                        >
                          Sửa
                        </button>
                        <button
                          type="button"
                          className="dc-btn-secondary"
                          disabled={savingBank}
                          onClick={() => setDeleteBankId(bankAccount.id)}
                        >
                          Xoá
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </article>
          </section>

          <section className="mt-6">
            <article className="dc-card p-4">
              <SectionHeader title="Lịch sử rút tiền" subtitle={`${payout.history.length} giao dịch`} />
              {payout.history.length === 0 ? (
                <EmptyState
                  title="Chưa có giao dịch rút tiền"
                  description="Các yêu cầu rút tiền sẽ xuất hiện tại đây."
                />
              ) : (
                <>
                  <div className="grid gap-2 md:hidden">
                    {payout.history.map((tx) => (
                      <div key={tx.id} className="rounded-2xl border border-zinc-200 bg-zinc-50 p-3">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-sm font-semibold text-zinc-900">{formatPoints(tx.amountVnd)}</p>
                          <StatusBadge status={tx.status} />
                        </div>
                        <p className="mt-1 text-xs text-zinc-500">Ngày tạo: {formatDate(tx.createdAt)}</p>
                        <p className="text-xs text-zinc-500">Ngân hàng: {tx.bankName}</p>
                        <p className="text-xs text-zinc-500">
                          Tài khoản: {tx.bankAccountName} • {maskAccountNumber(tx.bankAccountNumber)}
                        </p>
                        {tx.bankBin ? <p className="text-xs text-zinc-500">BIN / acqId: {tx.bankBin}</p> : null}
                        <p className="text-xs text-zinc-500">Ngày chi trả: {formatDate(tx.paidAt)}</p>
                        {tx.note ? <p className="mt-1 text-sm text-zinc-600">{tx.note}</p> : null}
                        <div className="mt-3 flex justify-end">
                          <button
                            type="button"
                            className="dc-btn-secondary"
                            onClick={() => setSelectedHistoryId(tx.id)}
                          >
                            Xem chi tiết
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="hidden overflow-x-auto rounded-2xl border border-zinc-200 md:block">
                    <table className="min-w-full text-sm">
                      <thead className="bg-zinc-100 text-zinc-700">
                        <tr>
                          <th className="px-3 py-2 text-left">Ngày giao dịch</th>
                          <th className="px-3 py-2 text-left">Số N-Point</th>
                          <th className="px-3 py-2 text-left">Ngân hàng nhận</th>
                          <th className="px-3 py-2 text-left">Trạng thái</th>
                          <th className="px-3 py-2 text-left">Ghi chú</th>
                          <th className="px-3 py-2 text-right">Chi tiết</th>
                        </tr>
                      </thead>
                      <tbody>
                        {payout.history.map((tx) => (
                          <tr key={tx.id} className="border-t border-zinc-200 bg-white">
                            <td className="px-3 py-2">{formatDate(tx.createdAt)}</td>
                            <td className="px-3 py-2 font-semibold text-zinc-900">{formatPoints(tx.amountVnd)}</td>
                            <td className="px-3 py-2 text-zinc-600">
                              <p>{tx.bankName}</p>
                              <p className="text-xs text-zinc-500">
                                {tx.bankAccountName} • {maskAccountNumber(tx.bankAccountNumber)}
                              </p>
                              {tx.bankBin ? <p className="text-xs text-zinc-500">BIN / acqId: {tx.bankBin}</p> : null}
                            </td>
                            <td className="px-3 py-2">
                              <StatusBadge status={tx.status} />
                            </td>
                            <td className="px-3 py-2 text-zinc-600">{tx.note ?? "-"}</td>
                            <td className="px-3 py-2 text-right">
                              <button
                                type="button"
                                className="dc-btn-secondary"
                                onClick={() => setSelectedHistoryId(tx.id)}
                              >
                                Xem chi tiết
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </article>
          </section>
        </>
      ) : null}

      <ConfirmDialog
        open={Boolean(deleteBankId)}
        title="Xoá tài khoản ngân hàng?"
        message="Tài khoản này sẽ không còn dùng để nhận tiền. Các yêu cầu rút đang chờ xử lý sẽ không được phép xoá."
        confirmLabel="Xoá tài khoản"
        cancelLabel="Huỷ"
        onCancel={() => setDeleteBankId(null)}
        onConfirm={() => void deleteBankAccount()}
      />

      <PayoutDetailModal
        open={Boolean(selectedHistoryId)}
        title="Chi tiết yêu cầu rút tiền"
        subtitle={
          selectedHistory ? `Số tiền: ${selectedHistory.amountVnd.toLocaleString("vi-VN")} VND` : "Đang tải chi tiết."
        }
        payout={selectedHistory}
        creator={payout?.creator ?? null}
        onClose={() => setSelectedHistoryId(null)}
      />

      {toast ? <ActionToast message={toast} onClose={() => setToast("")} /> : null}
    </>
  );
}
