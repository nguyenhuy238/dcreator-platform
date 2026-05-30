"use client";

import { FormEvent, useMemo, useState } from "react";
import Link from "next/link";
import { PublicFooter, PublicHeader } from "@/app/components/dcreator/layout/shell";
import { BRAND_SUBSCRIPTION_PACKAGES } from "@/lib/constants/brand-subscription";

type ContactFormState = {
  brandName: string;
  contactName: string;
  phone: string;
  email: string;
  notes: string;
};

const initialForm: ContactFormState = {
  brandName: "",
  contactName: "",
  phone: "",
  email: "",
  notes: ""
};

function formatPoints(value: number) {
  return `${value.toLocaleString("vi-VN")} N-Point`;
}

export default function BrandRegisterPage() {
  const [selectedPackageCode, setSelectedPackageCode] = useState(BRAND_SUBSCRIPTION_PACKAGES[0]?.code ?? "FREE");
  const [form, setForm] = useState<ContactFormState>(initialForm);
  const [submitted, setSubmitted] = useState(false);

  const selectedPackage = useMemo(
    () => BRAND_SUBSCRIPTION_PACKAGES.find((item) => item.code === selectedPackageCode) ?? BRAND_SUBSCRIPTION_PACKAGES[0],
    [selectedPackageCode]
  );

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitted(true);
  }

  return (
    <>
      <PublicHeader />
      <main className="mx-auto w-full max-w-7xl px-4 pb-24 pt-8 md:px-6">
      <section className="rounded-[2rem] border border-zinc-200 bg-white p-6 md:p-8">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-zinc-500">Brand Registration</p>
        <h1 className="mt-2 text-3xl font-black text-zinc-900 md:text-4xl">Đăng ký Brand cùng dCreator</h1>
        <p className="mt-2 max-w-3xl text-zinc-600">
          Chọn gói phù hợp và để lại thông tin liên hệ. Đội ngũ dCreator sẽ tiếp nhận và hỗ trợ bạn triển khai campaign.
        </p>
      </section>

      <section className="mt-6 grid gap-4 md:grid-cols-3">
        {BRAND_SUBSCRIPTION_PACKAGES.map((item) => {
          const isSelected = item.code === selectedPackageCode;
          return (
            <article
              key={item.code}
              className={`rounded-2xl border bg-white p-5 transition-all duration-200 ${
                isSelected ? "border-zinc-900 shadow-md" : "border-zinc-200 shadow-sm"
              } flex h-full flex-col`}
            >
              <h2 className="text-lg font-semibold text-zinc-900">{item.name}</h2>
              <p className="mt-1 text-2xl font-bold text-zinc-900">{formatPoints(item.pricePoints)}</p>
              <p className="mt-3 text-sm text-zinc-600">{item.summary}</p>

              <ul className="mt-4 space-y-2 text-sm text-zinc-700">
                {item.features.length > 0 ? item.features.map((feature) => <li key={feature}>• {feature}</li>) : <li>• Gói khởi tạo nền tảng</li>}
              </ul>

              {item.specialTitle ? (
                <div className="mt-4 rounded-xl border border-zinc-200 bg-zinc-50 p-3 text-sm text-zinc-700">
                  <p className="font-semibold text-zinc-900">{item.specialTitle}</p>
                  <p className="mt-1">{item.specialIntro}</p>
                </div>
              ) : null}

              <button
                type="button"
                onClick={() => setSelectedPackageCode(item.code)}
                className={`mt-auto pt-5 w-full rounded-xl px-4 py-2.5 text-sm font-semibold transition-all duration-200 ${
                  isSelected ? "bg-zinc-900 text-white" : "bg-zinc-100 text-zinc-900 hover:bg-zinc-200"
                }`}
              >
                {isSelected ? "Đã chọn gói này" : "Chọn gói này"}
              </button>
            </article>
          );
        })}
      </section>

      <section className="mt-6 rounded-[2rem] border border-zinc-200 bg-white p-6 md:p-8">
        <h2 className="text-2xl font-black text-zinc-900">Thông tin liên hệ</h2>
        <p className="mt-2 text-sm text-zinc-600">
          Gói đã chọn: <span className="font-semibold text-zinc-900">{selectedPackage?.name}</span>
        </p>

        <form onSubmit={onSubmit} className="mt-5 grid gap-4 md:grid-cols-2">
          <label className="space-y-2">
            <span className="text-sm font-medium text-zinc-700">Tên Brand</span>
            <input
              required
              value={form.brandName}
              onChange={(event) => setForm((prev) => ({ ...prev, brandName: event.target.value }))}
              className="w-full rounded-xl border border-zinc-200 px-4 py-2.5 text-zinc-900 outline-none ring-zinc-300 focus:ring"
              placeholder="Ví dụ: ABC Food"
            />
          </label>

          <label className="space-y-2">
            <span className="text-sm font-medium text-zinc-700">Người liên hệ</span>
            <input
              required
              value={form.contactName}
              onChange={(event) => setForm((prev) => ({ ...prev, contactName: event.target.value }))}
              className="w-full rounded-xl border border-zinc-200 px-4 py-2.5 text-zinc-900 outline-none ring-zinc-300 focus:ring"
              placeholder="Họ và tên"
            />
          </label>

          <label className="space-y-2">
            <span className="text-sm font-medium text-zinc-700">Số điện thoại</span>
            <input
              required
              value={form.phone}
              onChange={(event) => setForm((prev) => ({ ...prev, phone: event.target.value }))}
              className="w-full rounded-xl border border-zinc-200 px-4 py-2.5 text-zinc-900 outline-none ring-zinc-300 focus:ring"
              placeholder="09xxxxxxxx"
            />
          </label>

          <label className="space-y-2">
            <span className="text-sm font-medium text-zinc-700">Email</span>
            <input
              required
              type="email"
              value={form.email}
              onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))}
              className="w-full rounded-xl border border-zinc-200 px-4 py-2.5 text-zinc-900 outline-none ring-zinc-300 focus:ring"
              placeholder="contact@brand.com"
            />
          </label>

          <label className="space-y-2 md:col-span-2">
            <span className="text-sm font-medium text-zinc-700">Nhu cầu thêm</span>
            <textarea
              rows={4}
              value={form.notes}
              onChange={(event) => setForm((prev) => ({ ...prev, notes: event.target.value }))}
              className="w-full rounded-xl border border-zinc-200 px-4 py-2.5 text-zinc-900 outline-none ring-zinc-300 focus:ring"
              placeholder="Mô tả ngắn mục tiêu chiến dịch hoặc ngành hàng"
            />
          </label>

          <div className="md:col-span-2 flex flex-wrap items-center gap-3">
            <button type="submit" className="rounded-xl bg-zinc-900 px-6 py-3 text-sm font-semibold text-white hover:bg-zinc-800">
              Gửi thông tin đăng ký
            </button>
            <Link href="/" className="rounded-xl border border-zinc-200 px-6 py-3 text-sm font-semibold text-zinc-700 hover:bg-zinc-50">
              Quay về trang chủ
            </Link>
          </div>
        </form>

        {submitted ? (
          <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            Đã ghi nhận thông tin trên giao diện. Bản này chưa gửi dữ liệu sang hệ thống backend theo yêu cầu.
          </div>
        ) : null}
      </section>
      </main>
      <PublicFooter />
    </>
  );
}
