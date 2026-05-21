"use client";

import type { ReactNode } from "react";
import { Button } from "./button";
import { cn } from "./utils";

export function Modal({
  open,
  title,
  description,
  children,
  confirmLabel = "Xác nhận",
  cancelLabel = "Hủy",
  onConfirm,
  onClose,
}: {
  open: boolean;
  title: string;
  description?: string;
  children?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onClose: () => void;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-900/30 p-4">
      <div className={cn("w-full max-w-md rounded-2xl border border-dc-border bg-white p-5 shadow-xl")} role="dialog" aria-modal="true">
        <h3 className="font-heading text-xl font-black text-dc-text">{title}</h3>
        {description ? <p className="mt-1 text-sm text-dc-muted">{description}</p> : null}
        {children ? <div className="mt-3">{children}</div> : null}
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>{cancelLabel}</Button>
          <Button onClick={onConfirm}>{confirmLabel}</Button>
        </div>
      </div>
    </div>
  );
}
