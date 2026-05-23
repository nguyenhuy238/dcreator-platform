"use client";

import { useState } from "react";
import { AppShell, PublicHeader } from "@/app/components/dcreator/layout/shell";
import { PageHeader, SectionHeader } from "@/app/components/dcreator/ui/base";

export default function UserSettingsPage() {
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/auth/login";
  }

  async function fakeSave() {
    setSaving(true);
    await new Promise((resolve) => setTimeout(resolve, 400));
    setSaving(false);
    setMessage("Đã lưu cài đặt tài khoản.");
  }

  return (
    <>
      <PublicHeader />
      <AppShell>
        <PageHeader title="Cài đặt tài khoản" subtitle="Quản lý bảo mật, thông báo và phiên đăng nhập." />
        <section className="grid gap-4 md:grid-cols-2">
          <article className="dc-card p-5">
            <SectionHeader title="Bảo mật" />
            <p className="text-sm text-zinc-600">Đổi mật khẩu và quản lý thông tin truy cập.</p>
            <button type="button" className="dc-btn-secondary mt-3" onClick={fakeSave} disabled={saving}>{saving ? "Đang lưu..." : "Đổi mật khẩu"}</button>
          </article>
          <article className="dc-card p-5">
            <SectionHeader title="Thông báo" />
            <div className="mt-2 grid gap-2 text-sm">
              <label className="flex items-center gap-2"><input type="checkbox" defaultChecked /> Email về trạng thái duyệt</label>
              <label className="flex items-center gap-2"><input type="checkbox" defaultChecked /> Email về voucher/mission</label>
            </div>
            <button type="button" className="dc-btn-secondary mt-3" onClick={fakeSave} disabled={saving}>{saving ? "Đang lưu..." : "Lưu thông báo"}</button>
          </article>
        </section>
        <section className="mt-4">
          <article className="dc-card p-5">
            <SectionHeader title="Phiên đăng nhập" />
            <p className="text-sm text-zinc-600">Đăng xuất khỏi phiên hiện tại.</p>
            <button type="button" className="dc-btn-primary mt-3" onClick={logout}>Đăng xuất</button>
          </article>
        </section>
        {message ? <p className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{message}</p> : null}
      </AppShell>
    </>
  );
}
