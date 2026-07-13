"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { EmptyState, ErrorState, LoadingSkeleton } from "@/app/components/dcreator/ui/base";

export type DeleteImpactSection = {
  entity: string;
  count: number;
  reason?: string;
  type?: string;
};

export type DeleteImpact = {
  entityId: string;
  entityType: "USER" | "CREATOR" | "BRAND";
  canDeleteAccount: boolean;
  canHardDeleteAll: boolean;
  requiresAnonymization: boolean;
  requiresReassignment: boolean;
  blockers: DeleteImpactSection[];
  cascadeDelete: DeleteImpactSection[];
  anonymizeAndRetain: DeleteImpactSection[];
  reassignRequired: DeleteImpactSection[];
  warnings: string[];
};

type ApiResult<T> = { success: boolean; data: T; error?: string; message?: string; code?: string; details?: unknown };

function ImpactList({ title, items, tone }: { title: string; items: DeleteImpactSection[]; tone: "delete" | "retain" | "block" }) {
  const toneClass =
    tone === "block"
      ? "border-red-200 bg-red-50 text-red-800"
      : tone === "retain"
        ? "border-amber-200 bg-amber-50 text-amber-800"
        : "border-zinc-200 bg-zinc-50 text-zinc-800";

  if (items.length === 0) {
    return <EmptyState title={title} description="Không có dữ liệu trong nhóm này." />;
  }

  return (
    <section className={`rounded-2xl border p-3 ${toneClass}`}>
      <p className="text-sm font-bold">{title}</p>
      <div className="mt-2 grid gap-2">
        {items.map((item) => (
          <div key={`${item.entity}-${item.type ?? ""}`} className="rounded-xl bg-white/70 px-3 py-2 text-sm">
            <div className="flex items-center justify-between gap-3">
              <span className="font-semibold">{item.entity}</span>
              <span>{item.count.toLocaleString("vi-VN")}</span>
            </div>
            {item.reason ? <p className="mt-1 text-xs opacity-80">{item.reason}</p> : null}
          </div>
        ))}
      </div>
    </section>
  );
}

export function AdminDeleteDialog({
  open,
  title,
  confirmationLabel,
  expectedConfirmation,
  impactUrl,
  deleteUrl,
  modeOptions,
  onCancel,
  onDeleted
}: {
  open: boolean;
  title: string;
  confirmationLabel: string;
  expectedConfirmation: string;
  impactUrl: string;
  deleteUrl: string;
  modeOptions?: Array<{ value: string; label: string }>;
  onCancel: () => void;
  onDeleted: (message: string) => void;
}) {
  const [impact, setImpact] = useState<DeleteImpact | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [reason, setReason] = useState("");
  const [mode, setMode] = useState(modeOptions?.[0]?.value ?? "DELETE_ENTITY_ONLY");

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    setError("");
    setImpact(null);
    setConfirmation("");
    setReason("");
    fetch(impactUrl, { cache: "no-store" })
      .then(async (res) => {
        const body = (await res.json()) as ApiResult<DeleteImpact>;
        if (!res.ok || !body.success) throw new Error(body.error ?? body.message ?? "Không tải được delete impact");
        if (!cancelled) setImpact(body.data);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Không tải được delete impact");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [impactUrl, open]);

  const canSubmit = useMemo(() => {
    return Boolean(impact && impact.blockers.length === 0 && confirmation === expectedConfirmation && reason.trim().length >= 3 && !submitting);
  }, [confirmation, expectedConfirmation, impact, reason, submitting]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch(deleteUrl, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirmation, reason, mode })
      });
      const body = (await res.json()) as ApiResult<{ mode: string }>;
      if (!res.ok || !body.success) throw new Error(body.error ?? body.message ?? "Xóa thất bại");
      onDeleted(body.data?.mode ? `Đã xử lý xóa: ${body.data.mode}` : "Đã xử lý xóa");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Xóa thất bại");
    } finally {
      setSubmitting(false);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/45 p-4" onClick={() => !submitting && onCancel()}>
      <form className="max-h-[90vh] w-full max-w-3xl overflow-auto rounded-2xl border border-zinc-200 bg-white p-5 shadow-xl" onSubmit={submit} onClick={(e) => e.stopPropagation()}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="text-lg font-bold text-zinc-900">{title}</h3>
            <p className="mt-1 text-sm text-zinc-600">Thao tác này không thể hoàn tác. Backend sẽ chạy lại preflight trong transaction trước khi xóa.</p>
          </div>
          <button type="button" className="dc-btn-secondary" disabled={submitting} onClick={onCancel}>
            Đóng
          </button>
        </div>

        {loading ? <div className="mt-4"><LoadingSkeleton rows={3} /></div> : null}
        {error ? <div className="mt-4"><ErrorState title="Không thể xử lý" description={error} /></div> : null}

        {impact ? (
          <div className="mt-4 grid gap-3">
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-zinc-200 p-3">
                <p className="text-xs uppercase text-zinc-500">Hard delete toàn bộ</p>
                <p className="mt-1 font-bold text-zinc-900">{impact.canHardDeleteAll ? "Có" : "Không"}</p>
              </div>
              <div className="rounded-2xl border border-zinc-200 p-3">
                <p className="text-xs uppercase text-zinc-500">Anonymize</p>
                <p className="mt-1 font-bold text-zinc-900">{impact.requiresAnonymization ? "Có" : "Không"}</p>
              </div>
              <div className="rounded-2xl border border-zinc-200 p-3">
                <p className="text-xs uppercase text-zinc-500">Blocker</p>
                <p className="mt-1 font-bold text-zinc-900">{impact.blockers.length}</p>
              </div>
            </div>
            {impact.warnings.map((warning) => (
              <p key={warning} className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">{warning}</p>
            ))}
            <ImpactList title="Sẽ xóa an toàn" items={impact.cascadeDelete} tone="delete" />
            <ImpactList title="Sẽ giữ/anonymize" items={impact.anonymizeAndRetain} tone="retain" />
            <ImpactList title="Blocker" items={impact.blockers} tone="block" />
            {impact.reassignRequired.length > 0 ? <ImpactList title="Cần chuyển quyền" items={impact.reassignRequired} tone="block" /> : null}

            {modeOptions?.length ? (
              <label className="grid gap-1.5 text-sm font-medium text-zinc-700">
                <span>Kiểu xóa</span>
                <select className="dc-input" value={mode} disabled={submitting} onChange={(event) => setMode(event.target.value)}>
                  {modeOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                </select>
              </label>
            ) : null}

            <label className="grid gap-1.5 text-sm font-medium text-zinc-700">
              <span>Nhập lại {confirmationLabel}</span>
              <input className="dc-input" value={confirmation} disabled={submitting} onChange={(event) => setConfirmation(event.target.value)} placeholder={expectedConfirmation} />
            </label>
            <label className="grid gap-1.5 text-sm font-medium text-zinc-700">
              <span>Lý do xóa</span>
              <textarea className="dc-input min-h-24" value={reason} disabled={submitting} onChange={(event) => setReason(event.target.value)} />
            </label>
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button type="button" className="dc-btn-secondary" disabled={submitting} onClick={onCancel}>Hủy</button>
              <button type="submit" className="rounded-xl bg-red-600 px-6 py-3 font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50" disabled={!canSubmit}>
                {submitting ? "Đang xóa..." : "Xóa vĩnh viễn"}
              </button>
            </div>
          </div>
        ) : null}
      </form>
    </div>
  );
}
