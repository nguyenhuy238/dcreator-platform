"use client";

import { useState, type FormEvent } from "react";
import { AnalyticsEvents } from "@/lib/analytics-events";
import { trackEvent } from "@/lib/analytics";

type ApiResult<T> = { success: boolean; data?: T; error?: string };

type BrandConsultationPageFormProps = {
  source: string;
};

export function BrandConsultationPageForm({ source }: BrandConsultationPageFormProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");

    trackEvent(AnalyticsEvents.BRAND_UPGRADE_SUBMIT, {
      page_source: source,
      role: "brand"
    });

    try {
      const response = await fetch("/api/brand/consultations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email,
          phone,
          note,
          source
        })
      });
      const payload = (await response.json()) as ApiResult<unknown>;
      if (!response.ok || !payload.success) {
        throw new Error(payload.error ?? "Không thể gửi thông tin tư vấn.");
      }

      trackEvent(AnalyticsEvents.BRAND_UPGRADE_SUCCESS, {
        page_source: source,
        role: "brand"
      });
      setSuccess("Đã gửi thông tin. Đội ngũ dCreator sẽ liên hệ sớm.");
      setName("");
      setEmail("");
      setPhone("");
      setNote("");
    } catch (submitError) {
      trackEvent(AnalyticsEvents.BRAND_UPGRADE_FAILED, {
        page_source: source,
        role: "brand"
      });
      setError(submitError instanceof Error ? submitError.message : "Không thể gửi thông tin tư vấn.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className="rounded-[2rem] border border-zinc-200 bg-white p-6 shadow-sm md:p-8" onSubmit={onSubmit}>
      <div>
        <p className="text-xs font-black uppercase tracking-[0.16em] text-zinc-500">Nhận tư vấn</p>
        <h2 className="mt-3 text-2xl font-black text-zinc-900 md:text-3xl">Bắt đầu cùng dCreator</h2>
        <p className="mt-3 text-sm leading-6 text-zinc-600">
          Để lại thông tin để đội ngũ dCreator tư vấn gói phù hợp và lộ trình triển khai campaign cho brand của bạn.
        </p>
      </div>

      <div className="mt-6 grid gap-4">
        <label className="grid gap-1.5 text-sm font-medium text-zinc-700">
          Tên thương hiệu hoặc người liên hệ
          <input
            className="dc-input"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Ví dụ: NONE O2O / Nguyễn An"
            required
            minLength={2}
          />
        </label>

        <label className="grid gap-1.5 text-sm font-medium text-zinc-700">
          Email
          <input
            type="email"
            className="dc-input"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="brand@company.vn"
            required
          />
        </label>

        <label className="grid gap-1.5 text-sm font-medium text-zinc-700">
          Số điện thoại
          <input
            className="dc-input"
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
            placeholder="09xx xxx xxx"
            required
            minLength={6}
          />
        </label>

        <label className="grid gap-1.5 text-sm font-medium text-zinc-700">
          Thông tin thêm
          <textarea
            className="dc-input min-h-28 resize-y py-3"
            value={note}
            onChange={(event) => setNote(event.target.value)}
            placeholder="Ngành hàng, mục tiêu campaign hoặc gói bạn đang quan tâm."
            maxLength={500}
          />
        </label>
      </div>

      {error ? <p className="mt-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}
      {success ? <p className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{success}</p> : null}

      <button type="submit" className="mt-6 dc-btn-primary w-full rounded-xl py-3 text-sm font-black" disabled={loading}>
        {loading ? "Đang gửi..." : "Gửi thông tin tư vấn"}
      </button>
    </form>
  );
}
