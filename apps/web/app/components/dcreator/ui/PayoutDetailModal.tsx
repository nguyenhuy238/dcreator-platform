"use client";

import type { ReactNode } from "react";
import { StatusBadge } from "@/app/components/dcreator/ui/base";

export type PayoutModalCreator = {
  displayName: string;
  email: string;
  mainPlatform?: string | null;
  socialUrl?: string | null;
  followerCount?: number | null;
};

export type PayoutModalData = {
  id: string;
  amountVnd: number;
  status: "PENDING" | "APPROVED" | "PAID" | "REJECTED";
  note: string | null;
  createdAt: string;
  reviewedAt?: string | null;
  paidAt?: string | null;
  bankName: string;
  bankCode?: string | null;
  bankBin?: string | null;
  bankAccountName: string;
  bankAccountNumber: string;
};

type PayoutDetailModalProps = {
  open: boolean;
  title: string;
  subtitle: string;
  payout: PayoutModalData | null;
  creator: PayoutModalCreator | null;
  actions?: ReactNode;
  onClose: () => void;
};

function formatDateTime(value?: string | null) {
  if (!value) return "-";
  return new Date(value).toLocaleString("vi-VN");
}

function formatPoints(value: number) {
  return `${value.toLocaleString("vi-VN")} N-Point`;
}

function normalizeTransferText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 50);
}

function buildVietQrUrl(payout: PayoutModalData | null) {
  if (!payout?.bankBin || !payout.bankAccountNumber) return null;

  const query = new URLSearchParams({
    amount: String(payout.amountVnd),
    addInfo: normalizeTransferText(`Rut tien ${payout.id.slice(-8)}`) || "Rut tien",
    accountName: payout.bankAccountName
  });

  return `https://img.vietqr.io/image/${payout.bankBin}-${encodeURIComponent(payout.bankAccountNumber)}-compact2.png?${query.toString()}`;
}

function DataRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1 border-b border-zinc-100 py-2 last:border-b-0">
      <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">{label}:</p>
      <div className="text-sm text-zinc-900">{value}</div>
    </div>
  );
}

export function PayoutDetailModal({
  open,
  title,
  subtitle,
  payout,
  creator,
  actions,
  onClose
}: PayoutDetailModalProps) {
  if (!open || !payout || !creator) return null;

  const qrUrl = buildVietQrUrl(payout);
  const rejectReason = payout.status === "REJECTED" ? payout.note?.trim() : "";
  const note = payout.status === "REJECTED" ? "" : payout.note?.trim() ?? "";

  return (
    <div className="fixed inset-0 z-[70] bg-black/45 p-4" onClick={onClose}>
      <div
        className="mx-auto flex h-full max-w-5xl items-center justify-center"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="max-h-[92vh] w-full overflow-hidden rounded-[28px] border border-zinc-200 bg-white shadow-2xl">
          <div className="flex items-start justify-between gap-4 border-b border-zinc-100 px-5 py-4 md:px-6">
            <div>
              <p className="text-lg font-black text-zinc-900">{title}</p>
              <p className="mt-1 text-sm text-zinc-600">{subtitle}</p>
            </div>
            <button
              type="button"
              aria-label="Đóng"
              className="rounded-xl border border-zinc-200 px-3 py-2 text-sm font-semibold text-zinc-600 transition hover:bg-zinc-50"
              onClick={onClose}
            >
              Đóng
            </button>
          </div>

          <div className="max-h-[calc(92vh-76px)] overflow-y-auto px-5 py-5 md:px-6">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-3xl border border-zinc-200 bg-zinc-50 px-4 py-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Mã yêu cầu</p>
                <p className="mt-1 text-sm font-semibold text-zinc-900">{payout.id}</p>
              </div>
              <StatusBadge status={payout.status} />
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <section className="rounded-3xl border border-zinc-200 bg-white p-4">
                <p className="text-base font-bold text-zinc-900">Thông tin Creator</p>
                <div className="mt-3">
                  <DataRow label="Tên Creator" value={creator.displayName} />
                  <DataRow label="Email" value={creator.email} />
                </div>

                <div className="mt-5 border-t border-zinc-200 pt-4">
                  <p className="text-base font-bold text-zinc-900">Thông tin giao dịch</p>
                  <div className="mt-3">
                    <DataRow label="Số tiền" value={formatPoints(payout.amountVnd)} />
                    <DataRow label="Ngày tạo" value={formatDateTime(payout.createdAt)} />
                    {payout.paidAt ? <DataRow label="Ngày thanh toán" value={formatDateTime(payout.paidAt)} /> : null}
                    {note ? <DataRow label="Ghi chú" value={note} /> : null}
                  </div>
                </div>

                {payout.status === "REJECTED" ? (
                  <div className="mt-4 grid gap-3">
                    {rejectReason ? (
                      <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                        <p className="font-semibold">Lý do từ chối</p>
                        <p className="mt-1">{rejectReason}</p>
                      </div>
                    ) : null}
                    <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                      N-Point của Creator đã được hoàn lại vào số dư khả dụng.
                    </div>
                  </div>
                ) : null}
              </section>

              <section className="rounded-3xl border border-zinc-200 bg-white p-4">
                <p className="text-base font-bold text-zinc-900">Thông tin ngân hàng</p>
                <div className={`mt-3 grid gap-4 ${qrUrl ? "lg:grid-cols-[1fr_220px]" : ""}`}>
                  <div>
                    <DataRow label="Ngân hàng" value={payout.bankName} />
                    <DataRow label="Tên chủ tài khoản" value={payout.bankAccountName} />
                    <DataRow label="Số tài khoản" value={payout.bankAccountNumber} />
                  </div>

                  {qrUrl ? (
                    <div className="flex items-center justify-center rounded-3xl border border-zinc-200 bg-zinc-50 p-3">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={qrUrl}
                        alt={`QR chuyển khoản cho ${payout.bankAccountName}`}
                        className="h-auto w-full max-w-[180px] rounded-2xl border border-zinc-100 bg-white"
                      />
                    </div>
                  ) : null}
                </div>
              </section>
            </div>

            {actions ? <div className="mt-5 flex flex-wrap justify-end gap-2">{actions}</div> : null}
          </div>
        </div>
      </div>
    </div>
  );
}
