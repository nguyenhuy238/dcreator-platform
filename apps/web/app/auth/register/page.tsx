"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { PublicHeader } from "@/app/components/dcreator/layout/shell";
import { FormField } from "@/app/components/dcreator/ui/base";
import { PasswordInput } from "@/app/components/dcreator/ui/PasswordInput";
import { resolveWorkspaceLanding } from "@/lib/auth/workspace-choice";
import type { Role } from "@prisma/client";

export default function RegisterPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<{ displayName?: string; email?: string; password?: string }>({});

  useEffect(() => {
    let alive = true;
    async function checkAuth() {
      const response = await fetch("/api/auth/me", { cache: "no-store" });
      const payload = await response.json();
      if (!alive) return;
      if (response.ok && payload?.success && payload?.data?.user?.roles) {
        const decision = resolveWorkspaceLanding({
          roles: payload.data.user.roles as Role[],
          creatorProfile: payload.data.user.creatorProfile ?? null,
          brandMemberships: payload.data.user.brandMemberships ?? []
        });
        router.replace(decision.href);
      }
    }
    void checkAuth();
    return () => {
      alive = false;
    };
  }, [router]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    setFieldErrors({});
    const formData = new FormData(event.currentTarget);
    const displayName = String(formData.get("displayName") ?? "");
    const email = String(formData.get("email") ?? "");
    const password = String(formData.get("password") ?? "");
    const nextFieldErrors: { displayName?: string; email?: string; password?: string } = {};
    if (displayName.trim().length < 2) nextFieldErrors.displayName = "Tên hiển thị cần từ 2 ký tự.";
    if (!email.includes("@")) nextFieldErrors.email = "Email không hợp lệ.";
    if (password.length < 8) nextFieldErrors.password = "Mật khẩu cần tối thiểu 8 ký tự.";
    if (Object.keys(nextFieldErrors).length > 0) {
      setFieldErrors(nextFieldErrors);
      setLoading(false);
      return;
    }
    const response = await fetch("/api/auth/register", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ displayName, email, password }) });
    const payload = await response.json();
    setLoading(false);
    if (!response.ok || !payload.success) return setError(payload.error ?? "Đăng ký thất bại");
    const meResponse = await fetch("/api/auth/me", { cache: "no-store" });
    const mePayload = await meResponse.json();
    const roles = (mePayload?.data?.user?.roles ?? payload?.data?.roles ?? [payload?.data?.role].filter(Boolean)) as Role[];
    const decision = resolveWorkspaceLanding({
      roles,
      creatorProfile: mePayload?.data?.user?.creatorProfile ?? null,
      brandMemberships: mePayload?.data?.user?.brandMemberships ?? []
    });
    router.push(decision.href);
    router.refresh();
  }

  return <><PublicHeader /><main className="mx-auto w-full max-w-xl px-4 py-10 md:px-6"><form className="space-y-4 rounded-[28px] border border-zinc-200 bg-white p-6 shadow-[0_40px_120px_-60px_rgba(24,24,27,0.55)]" onSubmit={onSubmit}><h1 className="text-3xl font-black">Tạo tài khoản dCreator</h1><p className="text-sm text-zinc-600">Bạn đăng ký tài khoản cơ bản trước. Nếu muốn trở thành Creator hoặc Brand, hãy vào User profile sau khi đăng nhập để gửi hồ sơ chờ admin duyệt.</p><FormField label="Tên hiển thị" error={fieldErrors.displayName}><input name="displayName" className={`dc-input ${fieldErrors.displayName ? "border-red-500 ring-1 ring-red-300" : ""}`} placeholder="Ví dụ: Nguyen An" required minLength={2} /></FormField><FormField label="Email" error={fieldErrors.email}><input name="email" type="email" className={`dc-input ${fieldErrors.email ? "border-red-500 ring-1 ring-red-300" : ""}`} placeholder="example@email.com" required /></FormField><FormField label="Mật khẩu" error={fieldErrors.password}><PasswordInput name="password" className={fieldErrors.password ? "border-red-500 ring-1 ring-red-300" : ""} placeholder="Tối thiểu 8 ký tự" required minLength={8} /></FormField>{error ? <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}<button className="dc-btn-primary w-full" disabled={loading}>{loading ? "Đang tạo tài khoản..." : "Đăng ký tài khoản"}</button></form></main></>;
}
