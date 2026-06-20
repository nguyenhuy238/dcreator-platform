"use client";

import { FormEvent, useEffect, useState } from "react";

type ApiResult<T> = { success: boolean; data?: T; error?: string };

type BrandConsultationModalProps = {
  source: string;
  triggerLabel?: string;
  triggerClassName?: string;
  interestedPackage?: string;
  title?: string;
  description?: string;
  submitLabel?: string;
};

export function BrandConsultationModal({
  source,
  triggerLabel = "Đặt lịch tư vấn 1:1",
  triggerClassName = "inline-flex w-full items-center justify-center rounded-md border border-white/15 bg-black/20 px-8 py-3 text-sm font-black text-white transition-colors duration-200 hover:bg-white/10 sm:w-auto",
  interestedPackage,
  title = "Đặt lịch tư vấn 1:1",
  description = "Gửi thông tin của bạn để đội ngũ dCreator liên hệ tư vấn.",
  submitLabel = "Gửi thông tin"
}: BrandConsultationModalProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [facebookUrl, setFacebookUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    if (!open) {
      setError("");
      setSuccess("");
    }
  }, [open]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const response = await fetch("/api/brand/consultations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          phone,
          facebookUrl,
          source,
          interestedPackage
        })
      });
      const payload = (await response.json()) as ApiResult<unknown>;
      if (!response.ok || !payload.success) {
        throw new Error(payload.error ?? "Không thể gửi thông tin tư vấn.");
      }

      setSuccess("Đã gửi thông tin tư vấn. Đội ngũ dCreator sẽ liên hệ sớm.");
      setName("");
      setPhone("");
      setFacebookUrl("");
      window.setTimeout(() => setOpen(false), 900);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Không thể gửi thông tin tư vấn.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <button
        type="button"
        className={triggerClassName}
        onClick={() => setOpen(true)}
      >
        {triggerLabel}
      </button>

      {open ? (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/45 p-4" onClick={() => !loading && setOpen(false)}>
          <form className="max-h-[90dvh] w-[calc(100vw-2rem)] max-w-md overflow-y-auto rounded-2xl border border-zinc-200 bg-white p-5 shadow-xl" onSubmit={onSubmit} onClick={(event) => event.stopPropagation()}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-bold text-zinc-900">{title}</h3>
                <p className="mt-1 text-sm text-zinc-600">{description}</p>
              </div>
              <button
                type="button"
                aria-label="Đóng popup"
                className="rounded-lg border border-zinc-200 px-2 py-1 text-sm font-bold text-zinc-600 transition hover:bg-zinc-100"
                disabled={loading}
                onClick={() => setOpen(false)}
              >
                ×
              </button>
            </div>
            {interestedPackage ? (
              <div className="mt-4 rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm font-semibold text-zinc-700">
                Gói quan tâm: <span className="text-zinc-950">{interestedPackage}</span>
              </div>
            ) : null}

            <div className="mt-4 grid gap-3">
              <label className="grid gap-1.5 text-sm font-medium text-zinc-700">
                Tên
                <input className="dc-input" value={name} onChange={(event) => setName(event.target.value)} placeholder="Nhập tên của bạn" required minLength={2} />
              </label>
              <label className="grid gap-1.5 text-sm font-medium text-zinc-700">
                Số điện thoại
                <input className="dc-input" value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="09xx xxx xxx" required minLength={6} />
              </label>
              <label className="grid gap-1.5 text-sm font-medium text-zinc-700">
                Link Facebook
                <input className="dc-input" value={facebookUrl} onChange={(event) => setFacebookUrl(event.target.value)} placeholder="https://facebook.com/..." required />
              </label>
            </div>

            {error ? <p className="mt-4 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}
            {success ? <p className="mt-4 rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{success}</p> : null}

            <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button type="button" className="dc-btn-secondary w-full sm:w-auto" disabled={loading} onClick={() => setOpen(false)}>
                Hủy
              </button>
              <button type="submit" className="dc-btn-primary w-full sm:w-auto" disabled={loading}>
                {loading ? "Đang gửi..." : submitLabel}
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </>
  );
}
