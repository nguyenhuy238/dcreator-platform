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

function formatMoney(value: number) {
  return `${value.toLocaleString("vi-VN")} VND`;
}

function formatFollowerCount(value?: number | null) {
  if (!value || value <= 0) return "-";
  return value.toLocaleString("vi-VN");
}

function maskAccountNumber(value: string) {
  if (value.length <= 4) return value;
  return `${"*".repeat(Math.max(0, value.length - 4))}${value.slice(-4)}`;
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
    <div className="grid gap-1 border-b border-zinc-100 py-2 last:border-b-0">
      <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">{label}</p>
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
  const rejectReason = payout.status === "REJECTED" ? payout.note : null;
  const note = payout.status === "REJECTED" ? null : payout.note;

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
                  <DataRow label="Nền tảng chính" value={creator.mainPlatform ?? "-"} />
                  <DataRow label="Kênh chính" value={creator.socialUrl ?? "-"} />
                  <DataRow label="Người theo dõi" value={formatFollowerCount(creator.followerCount)} />
                </div>
              </section>

              <section className="rounded-3xl border border-zinc-200 bg-white p-4">
                <p className="text-base font-bold text-zinc-900">Thông tin ngân hàng</p>
                <div className="mt-3">
                  <DataRow label="Ngân hàng" value={payout.bankName} />
                  <DataRow label="Mã ngân hàng" value={payout.bankCode ?? "-"} />
                  <DataRow label="BIN / acqId" value={payout.bankBin ?? "-"} />
                  <DataRow label="Tên chủ tài khoản" value={payout.bankAccountName} />
                  <DataRow label="Số tài khoản" value={payout.bankAccountNumber} />
                  <DataRow label="Số tài khoản ẩn" value={maskAccountNumber(payout.bankAccountNumber)} />
                </div>
              </section>
            </div>

            <section className="mt-4 rounded-3xl border border-zinc-200 bg-white p-4">
              <p className="text-base font-bold text-zinc-900">Thông tin giao dịch</p>
              <div className="mt-3 grid gap-3 md:grid-cols-2">
                <DataRow label="Số tiền" value={formatMoney(payout.amountVnd)} />
                <DataRow label="Ngày tạo" value={formatDateTime(payout.createdAt)} />
                <DataRow label="Ngày duyệt" value={formatDateTime(payout.reviewedAt)} />
                <DataRow label="Ngày thanh toán" value={formatDateTime(payout.paidAt)} />
                <DataRow label="Ghi chú" value={note ?? "-"} />
                <DataRow label="Lý do từ chối" value={rejectReason ?? "-"} />
              </div>
            </section>

            <section className="mt-4 rounded-3xl border border-zinc-200 bg-zinc-50 p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-base font-bold text-zinc-900">Mã QR chuyển khoản</p>
                  <p className="mt-1 text-sm text-zinc-600">
                    VietQR sẽ tự điền sẵn số tiền và thông tin chuyển khoản để admin thao tác nhanh hơn.
                  </p>
                </div>
                <p className="text-xs font-medium text-zinc-500">Nguồn tạo QR: VietQR Quick Link</p>
              </div>

              {qrUrl ? (
                <div className="mt-4 flex justify-center rounded-3xl border border-zinc-200 bg-white p-4">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={qrUrl}
                    alt={`QR chuyển khoản cho ${payout.bankAccountName}`}
                    className="h-auto w-full max-w-md rounded-2xl border border-zinc-100"
                  />
                </div>
              ) : (
                <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
                  Chưa đủ dữ liệu ngân hàng để tạo QR tự động.
                </div>
              )}
            </section>

            {actions ? <div className="mt-5 flex flex-wrap justify-end gap-2">{actions}</div> : null}
          </div>
        </div>
      </div>
    </div>
  );
}
