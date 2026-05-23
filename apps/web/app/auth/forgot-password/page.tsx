"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { PublicHeader } from "@/app/components/dcreator/layout/shell";
import { FormField } from "@/app/components/dcreator/ui/base";

export default function ForgotPasswordPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);
    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("email") ?? "");
    if (!email.includes("@")) {
      setError("Email không hợp lệ.");
      setLoading(false);
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, 600));
    setLoading(false);
    setSuccess("Nếu email tồn tại, hệ thống sẽ gửi hướng dẫn khôi phục mật khẩu.");
  }

  return (
    <>
      <PublicHeader />
      <main className="mx-auto w-full max-w-xl px-4 py-10 md:px-6">
        <form className="space-y-4 rounded-[28px] border border-zinc-200 bg-white p-6 shadow-[0_40px_120px_-60px_rgba(24,24,27,0.55)]" onSubmit={onSubmit}>
          <h1 className="text-3xl font-black">Khôi phục mật khẩu</h1>
          <p className="text-sm text-zinc-600">Nhập email tài khoản dCreator để nhận hướng dẫn đặt lại mật khẩu.</p>
          <FormField label="Email">
            <input name="email" type="email" className="dc-input" placeholder="example@email.com" required />
          </FormField>
          {error ? <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}
          {success ? <p className="rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{success}</p> : null}
          <button className="dc-btn-primary w-full" disabled={loading}>{loading ? "Đang gửi..." : "Gửi yêu cầu"}</button>
          <p className="text-sm text-zinc-600">Đã nhớ mật khẩu? <Link href="/auth/login" className="font-semibold text-zinc-900">Quay lại đăng nhập</Link></p>
        </form>
      </main>
    </>
  );
}
