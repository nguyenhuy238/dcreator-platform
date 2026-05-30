"use client";

import { useEffect, useState } from "react";

type ReviewActionDialogProps = {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  requireReason?: boolean;
  reasonLabel?: string;
  reasonPlaceholder?: string;
  submitting?: boolean;
  onCancel: () => void;
  onConfirm: (reason?: string) => void;
};

export function ReviewActionDialog({
  open,
  title,
  description,
  confirmLabel = "Xác nhận",
  requireReason = false,
  reasonLabel = "Lý do",
  reasonPlaceholder = "Nhập lý do...",
  submitting = false,
  onCancel,
  onConfirm
}: ReviewActionDialogProps) {
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (open) {
      setReason("");
      setError("");
    }
  }, [open]);

  if (!open) return null;

  function handleConfirm() {
    const trimmedReason = reason.trim();
    if (requireReason && trimmedReason.length < 5) {
      setError("Lý do tối thiểu 5 ký tự.");
      return;
    }
    onConfirm(trimmedReason || undefined);
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/45 p-4" onClick={onCancel}>
      <div className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-lg font-bold text-zinc-900">{title}</h3>
        <p className="mt-2 text-sm text-zinc-600">{description}</p>
        {requireReason ? (
          <div className="mt-4 grid gap-1.5">
            <label className="text-sm font-medium text-zinc-700">{reasonLabel}</label>
            <textarea
              className="dc-input min-h-24"
              value={reason}
              onChange={(event) => {
                setReason(event.target.value);
                if (error) setError("");
              }}
              placeholder={reasonPlaceholder}
            />
            {error ? <p className="text-xs text-red-600">{error}</p> : null}
          </div>
        ) : null}
        <div className="mt-5 flex justify-end gap-2">
          <button className="dc-btn-secondary" onClick={onCancel} disabled={submitting}>Hủy</button>
          <button className="dc-btn-primary" onClick={handleConfirm} disabled={submitting}>{submitting ? "Đang xử lý..." : confirmLabel}</button>
        </div>
      </div>
    </div>
  );
}
