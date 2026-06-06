import type { CSSProperties, ReactNode } from "react";

export function StatusBadge({ status }: { status: string }) {
  const labels: Record<string, string> = {
    DRAFT: "Bản nháp",
    PENDING: "Đang chờ",
    PENDING_REVIEW: "Chờ duyệt",
    APPROVED: "Đã duyệt",
    REJECTED: "Đã từ chối",
    NEEDS_REVISION: "Cần bổ sung",
    ACTIVE: "Đang hoạt động",
    INACTIVE: "Không hoạt động",
    VERIFIED: "Đã xác minh",
    UNVERIFIED: "Chưa xác minh",
    LOCKED: "Đã khóa",
    COMPLETED: "Đã hoàn thành",
    CANCELLED: "Đã hủy",
    FAILED: "Thất bại",
    SUCCESS: "Thành công",
    PROCESSING: "Đang xử lý",
    PAID: "Đã thanh toán",
    UNPAID: "Chưa thanh toán",
    EXPIRED: "Đã hết hạn",
    USED: "Đã sử dụng",
    AVAILABLE: "Có sẵn",
    OUT_OF_STOCK: "Hết hàng",
    FULL: "Hết slot",
    NO_SLOTS: "Hết slot"
  };
  const map: Record<string, string> = {
    active: "bg-emerald-50 text-emerald-700 border-emerald-200",
    review: "bg-amber-50 text-amber-700 border-amber-200",
    ended: "bg-zinc-100 text-zinc-600 border-zinc-200",
    full: "bg-red-50 text-red-700 border-red-200",
    used: "bg-zinc-100 text-zinc-700 border-zinc-200",
    expired: "bg-zinc-100 text-zinc-700 border-zinc-200",
    cancelled: "bg-red-50 text-red-700 border-red-200",
    approved: "bg-emerald-50 text-emerald-700 border-emerald-200",
    paid: "bg-emerald-50 text-emerald-700 border-emerald-200",
    rejected: "bg-red-50 text-red-700 border-red-200",
    needs_revision: "bg-amber-50 text-amber-700 border-amber-200",
    pending: "bg-blue-50 text-blue-700 border-blue-200"
  };

  return <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${map[status.toLowerCase()] ?? "bg-zinc-100 text-zinc-700 border-zinc-200"}`}>{labels[status] ?? status}</span>;
}

export function PageHeader({ title, subtitle, action }: { title: string; subtitle: string; action?: ReactNode }) {
  return <header className="mb-6 flex flex-wrap items-end justify-between gap-3"><div><h1 className="text-3xl font-black tracking-tight text-zinc-900">{title}</h1><p className="mt-1 text-sm text-zinc-600">{subtitle}</p></div>{action}</header>;
}

export function SectionHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
  return <div className="mb-4 flex flex-wrap items-end justify-between gap-3"><div><h2 className="text-xl font-bold text-zinc-900">{title}</h2>{subtitle ? <p className="mt-1 text-sm text-zinc-600">{subtitle}</p> : null}</div>{action}</div>;
}

export function StatsCard({ title, value, hint }: { title: string; value: string; hint?: string }) {
  return <article className="dc-card p-4 md:p-5"><p className="text-xs uppercase tracking-wider text-zinc-500">{title}</p><p className="dc-kpi mt-2">{value}</p>{hint ? <p className="mt-1 text-sm text-zinc-500">{hint}</p> : null}</article>;
}

export function EmptyState({ title, description, action }: { title: string; description: string; action?: ReactNode }) {
  return <div className="dc-card p-8 text-center"><p className="text-lg font-bold text-zinc-900">{title}</p><p className="mt-2 text-sm text-zinc-600">{description}</p>{action ? <div className="mt-4">{action}</div> : null}</div>;
}

export function ErrorState({ title, description, onRetry }: { title: string; description: string; onRetry?: () => void }) {
  return <div role="alert" className="dc-card border-red-200 bg-red-50 p-5"><p className="font-bold text-red-700">{title}</p><p className="mt-1 text-sm text-red-600">{description}</p>{onRetry ? <button onClick={onRetry} className="dc-btn-secondary mt-3">Thử lại</button> : null}</div>;
}

export function LoadingSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="grid gap-3">
      {Array.from({ length: rows }).map((_, i) => (
        <LoadingBlock key={i} className="h-20 rounded-3xl" style={{ animationDelay: `${i * 80}ms` }} />
      ))}
    </div>
  );
}

export function LoadingBlock({ className, style }: { className?: string; style?: CSSProperties }) {
  return <div className={`dc-loading-shimmer bg-zinc-100 ${className ?? ""}`} style={style} />;
}

export function LoadingSpinner({ label = "Đang tải..." }: { label?: string }) {
  return (
    <div className="inline-flex items-center gap-2 text-sm font-medium text-zinc-600" role="status" aria-live="polite">
      <span className="dc-loading-spinner" aria-hidden="true" />
      <span>{label}</span>
    </div>
  );
}

export function ActionToast({
  message,
  title,
  description,
  tone = "success",
  onClose
}: {
  message?: string;
  title?: string;
  description?: string;
  tone?: "success" | "error" | "info" | "warning" | "loading";
  onClose?: () => void;
}) {
  const toneClass =
    tone === "error"
      ? "border-red-200 bg-red-50 text-red-800"
      : tone === "warning"
        ? "border-amber-200 bg-amber-50 text-amber-800"
        : tone === "info"
          ? "border-blue-200 bg-blue-50 text-blue-800"
          : tone === "loading"
            ? "border-zinc-200 bg-white text-zinc-800"
            : "border-emerald-200 bg-emerald-50 text-emerald-800";
  const iconClass =
    tone === "error"
      ? "bg-red-100 text-red-700"
      : tone === "warning"
        ? "bg-amber-100 text-amber-700"
        : tone === "info"
          ? "bg-blue-100 text-blue-700"
          : tone === "loading"
            ? "bg-zinc-100 text-zinc-700"
            : "bg-emerald-100 text-emerald-700";
  const resolvedTitle = title ?? message ?? "";
  const resolvedDescription = description ?? (title ? message : "");
  const icon = tone === "error" ? "!" : tone === "warning" ? "!" : tone === "info" ? "i" : tone === "loading" ? "" : "✓";

  return (
    <div role="status" aria-live="polite" className={`fixed right-4 top-4 z-[70] w-[calc(100vw-2rem)] max-w-sm rounded-2xl border px-4 py-3 shadow-xl ${toneClass}`}>
      <div className="flex items-start gap-3">
        <span className={`mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-sm font-black ${iconClass}`}>
          {tone === "loading" ? <span className="dc-loading-spinner" aria-hidden="true" /> : icon}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold">{resolvedTitle}</p>
          {resolvedDescription ? <p className="mt-0.5 text-sm opacity-85">{resolvedDescription}</p> : null}
        </div>
        {onClose ? (
          <button type="button" aria-label="Đóng thông báo" className="rounded-lg px-2 py-1 text-sm font-bold opacity-70 transition hover:bg-black/5 hover:opacity-100" onClick={onClose}>
            ×
          </button>
        ) : null}
      </div>
    </div>
  );
}

export function FormField({ label, error, children }: { label: ReactNode; error?: string; children: ReactNode }) {
  return <label className="grid gap-1.5 text-sm font-medium text-zinc-700"><span>{label}</span>{children}{error ? <span className="text-xs text-red-600">{error}</span> : null}</label>;
}

export function SectionCard({ title, children, action, className }: { title: string; children: ReactNode; action?: ReactNode; className?: string }) {
  return (
    <section className={`dc-card p-4 ${className ?? ""}`}>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <p className="font-semibold text-zinc-900">{title}</p>
        {action}
      </div>
      {children}
    </section>
  );
}

export function ConfirmDialog({
  open,
  title,
  message,
  description,
  confirmLabel = "Xác nhận",
  confirmText,
  cancelLabel = "Hủy",
  tone = "danger",
  onConfirm,
  onCancel
}: {
  open: boolean;
  title: string;
  message?: string;
  description?: string;
  confirmLabel?: string;
  confirmText?: string;
  cancelLabel?: string;
  tone?: "danger" | "primary";
  onConfirm: () => void;
  onCancel: () => void;
}) {
  if (!open) return null;
  const resolvedMessage = message || description || "";
  const resolvedConfirm = confirmText || confirmLabel;
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/45 p-4" onClick={onCancel}>
      <div className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-lg font-bold text-zinc-900">{title}</h3>
        <p className="mt-2 text-sm text-zinc-600">{resolvedMessage}</p>
        <div className="mt-5 flex justify-end gap-2">
          <button className="dc-btn-secondary" onClick={onCancel}>{cancelLabel}</button>
          <button className={tone === "danger" ? "dc-btn-secondary" : "dc-btn-primary"} onClick={onConfirm}>{resolvedConfirm}</button>
        </div>
      </div>
    </div>
  );
}
