"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { PublicHeader } from "@/app/components/dcreator/layout/shell";
import { FormField } from "@/app/components/dcreator/ui/base";
import { getDefaultDashboardPath } from "@/lib/auth/dashboard-access";
import type { Role } from "@prisma/client";

export default function RegisterPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let alive = true;
    async function checkAuth() {
      const response = await fetch("/api/auth/me", { cache: "no-store" });
      const payload = await response.json();
      if (!alive) return;
      if (response.ok && payload?.success && payload?.data?.user?.roles) {
        router.replace(getDefaultDashboardPath(payload.data.user.roles as Role[]));
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
    const formData = new FormData(event.currentTarget);
    const response = await fetch("/api/auth/register", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ displayName: formData.get("displayName"), email: formData.get("email"), password: formData.get("password") }) });
    const payload = await response.json();
    setLoading(false);
    if (!response.ok || !payload.success) return setError(payload.error ?? "Đăng ký thất bại");
    const roles = (payload?.data?.roles ?? [payload?.data?.role].filter(Boolean)) as Role[];
    router.push(getDefaultDashboardPath(roles));
    router.refresh();
  }

  return <><PublicHeader /><main className="mx-auto w-full max-w-xl px-4 py-10 md:px-6"><form className="dc-card space-y-4 p-6" onSubmit={onSubmit}><h1 className="text-3xl font-black">Tạo tài khoản dCreator</h1><p className="text-sm text-zinc-600">Bạn đăng ký tài khoản cơ bản trước. Nếu muốn trở thành Creator hoặc Brand, hãy vào User profile sau khi đăng nhập để gửi hồ sơ chờ admin duyệt.</p><FormField label="Tên hiển thị"><input name="displayName" className="dc-input" placeholder="Ví dụ: Nguyen An" required minLength={2} /></FormField><FormField label="Email"><input name="email" type="email" className="dc-input" placeholder="example@email.com" required /></FormField><FormField label="Mật khẩu"><input name="password" type="password" className="dc-input" placeholder="Tối thiểu 8 ký tự" required minLength={8} /></FormField>{error ? <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}<button className="dc-btn-primary" disabled={loading}>{loading ? "Đang tạo tài khoản..." : "Đăng ký tài khoản"}</button></form></main></>;
}
