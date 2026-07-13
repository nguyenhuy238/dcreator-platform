"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { AdminDeleteDialog } from "@/app/admin/_components/AdminDeleteDialog";
import { AdminDataTable } from "@/app/admin/_components/AdminDataTable";
import { StatusBadge } from "@/app/admin/_components/StatusBadge";
import { ActionToast, EmptyState, ErrorState, LoadingSkeleton, PageHeader, SectionHeader } from "@/app/components/dcreator/ui/base";

type Role = "USER" | "CREATOR" | "BRAND_OWNER" | "BRAND_STAFF" | "ADMIN" | "OPS";
type UserItem = {
  id: string;
  displayName: string;
  email: string;
  role: Role;
  isActive: boolean;
  profile?: { phone: string | null } | null;
  wallet?: { pointsBalance: number; cashBalanceVnd: number };
};
type UserDetail = UserItem & {
  phone: string | null;
  createdAt: string;
  updatedAt: string;
  roles: Role[];
  wallet: { pointsBalance: number; cashBalanceVnd: number; pendingPayoutVnd: number; withdrawnPayoutVnd: number } | null;
  creatorProfile: { id: string; displayName: string; isSuspended: boolean } | null;
  brandMemberships: Array<{ id: string; role: string; status: string; brand: { id: string; name: string; status: string } }>;
  ownedBrands: Array<{ id: string; name: string; status: string; isLocked: boolean }>;
  counts: Record<string, number>;
};
type ApiResult<T> = { success: boolean; data: T; error?: string; message?: string };

const roles: Role[] = ["USER", "CREATOR", "BRAND_OWNER", "BRAND_STAFF", "ADMIN", "OPS"];

export default function AdminUsersPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState("");
  const [query, setQuery] = useState("");
  const [role, setRole] = useState("");
  const [status, setStatus] = useState("");
  const [items, setItems] = useState<UserItem[]>([]);
  const [selected, setSelected] = useState<UserDetail | null>(null);
  const [edit, setEdit] = useState({ displayName: "", email: "", phone: "", role: "USER" as Role, isActive: true, reason: "" });
  const [deleteTarget, setDeleteTarget] = useState<UserItem | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ page: "1", limit: "50" });
      if (query.trim()) params.set("query", query.trim());
      if (role) params.set("role", role);
      if (status) params.set("status", status);
      const res = await fetch(`/api/admin/dashboard/users?${params.toString()}`, { cache: "no-store" });
      const body = (await res.json()) as ApiResult<{ items: UserItem[] }>;
      if (!res.ok || !body.success) throw new Error(body.error ?? body.message ?? "Tải danh sách người dùng thất bại");
      setItems(body.data.items);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Tải danh sách người dùng thất bại");
    } finally {
      setLoading(false);
    }
  }, [query, role, status]);

  useEffect(() => {
    void load();
  }, [load]);

  async function openDetail(userId: string) {
    setError(null);
    const res = await fetch(`/api/admin/dashboard/users/${userId}`, { cache: "no-store" });
    const body = (await res.json()) as ApiResult<UserDetail>;
    if (!res.ok || !body.success) {
      setError(body.error ?? body.message ?? "Tải chi tiết thất bại");
      return;
    }
    setSelected(body.data);
    setEdit({
      displayName: body.data.displayName,
      email: body.data.email,
      phone: body.data.phone ?? "",
      role: body.data.role,
      isActive: body.data.isActive,
      reason: ""
    });
  }

  async function toggleLock(userId: string, isActive: boolean) {
    const endpoint = isActive ? "lock" : "unlock";
    const res = await fetch(`/api/admin/dashboard/users/${userId}/${endpoint}`, { method: "POST" });
    const body = (await res.json()) as ApiResult<unknown>;
    if (!res.ok || !body.success) {
      setError(body.error ?? body.message ?? "Update user failed");
      return;
    }
    setToast(isActive ? "Đã khóa tài khoản" : "Đã mở khóa tài khoản");
    setTimeout(() => setToast(""), 2000);
    await load();
  }

  async function saveUser(e: FormEvent) {
    e.preventDefault();
    if (!selected) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/dashboard/users/${selected.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...edit, phone: edit.phone.trim() || null })
      });
      const body = (await res.json()) as ApiResult<unknown>;
      if (!res.ok || !body.success) throw new Error(body.error ?? body.message ?? "Cập nhật thất bại");
      setToast("Đã cập nhật người dùng thành công");
      setTimeout(() => setToast(""), 2000);
      await openDetail(selected.id);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Cập nhật thất bại");
    } finally {
      setSaving(false);
    }
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    void load();
  }

  return (
    <>
      <PageHeader title="Users CMS" subtitle="Quản lý danh sách user, role, trạng thái, chi tiết và xóa có preflight." />
      <section className="dc-card p-4">
        <form className="grid gap-2 md:grid-cols-[1fr_180px_160px_auto]" onSubmit={onSubmit}>
          <input className="dc-input" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Tìm theo tên, email hoặc phone" />
          <select className="dc-input" value={role} onChange={(e) => setRole(e.target.value)}>
            <option value="">Tất cả role</option>
            {roles.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
          <select className="dc-input" value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">Tất cả trạng thái</option>
            <option value="active">Đang hoạt động</option>
            <option value="locked">Đã khóa</option>
          </select>
          <button className="dc-btn-primary" type="submit">Lọc</button>
        </form>
      </section>
      {error ? <div className="mt-4"><ErrorState title="Có lỗi" description={error} onRetry={() => void load()} /></div> : null}
      {loading ? <div className="mt-4"><LoadingSkeleton rows={5} /></div> : null}
      {!loading && !error ? (
        <section className="mt-6">
          <SectionHeader title="User List" subtitle={`Tổng ${items.length} users`} />
          {items.length === 0 ? (
            <EmptyState title="Không có dữ liệu" description="Không tìm thấy user phù hợp." />
          ) : (
            <AdminDataTable headers={["User", "Role", "Status", "Wallet", "Action"]}>
              {items.map((item) => (
                <tr key={item.id} className="border-t border-zinc-100">
                  <td className="px-4 py-3">
                    <p className="font-semibold">{item.displayName}</p>
                    <p className="text-xs text-zinc-500">{item.email}</p>
                    {item.profile?.phone ? <p className="text-xs text-zinc-500">{item.profile.phone}</p> : null}
                  </td>
                  <td className="px-4 py-3">{item.role}</td>
                  <td className="px-4 py-3">{item.isActive ? <StatusBadge status="active" /> : <StatusBadge status="rejected" />}</td>
                  <td className="px-4 py-3">
                    <p>{(item.wallet?.pointsBalance ?? 0).toLocaleString("vi-VN")} points</p>
                    <p className="text-xs text-zinc-500">{(item.wallet?.cashBalanceVnd ?? 0).toLocaleString("vi-VN")} VND</p>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-2">
                      <button className="dc-btn-primary" onClick={() => void openDetail(item.id)}>Chi tiết</button>
                      <button className={item.isActive ? "dc-btn-secondary" : "dc-btn-primary"} onClick={() => void toggleLock(item.id, item.isActive)}>
                        {item.isActive ? "Khóa" : "Mở khóa"}
                      </button>
                      <button className="rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-red-700" onClick={() => setDeleteTarget(item)}>Xóa</button>
                    </div>
                  </td>
                </tr>
              ))}
            </AdminDataTable>
          )}
        </section>
      ) : null}

      {selected ? (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/45 p-4" onClick={() => !saving && setSelected(null)}>
          <form className="max-h-[90vh] w-full max-w-3xl overflow-auto rounded-2xl border border-zinc-200 bg-white p-5 shadow-xl" onSubmit={saveUser} onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-bold text-zinc-900">Chi tiết tài khoản</h3>
                <p className="mt-1 text-sm text-zinc-500">{selected.id}</p>
              </div>
              <button type="button" className="dc-btn-secondary" disabled={saving} onClick={() => setSelected(null)}>Đóng</button>
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <label className="grid gap-1.5 text-sm font-medium text-zinc-700">Tên hiển thị<input className="dc-input" value={edit.displayName} onChange={(e) => setEdit({ ...edit, displayName: e.target.value })} /></label>
              <label className="grid gap-1.5 text-sm font-medium text-zinc-700">Email<input className="dc-input" value={edit.email} onChange={(e) => setEdit({ ...edit, email: e.target.value })} /></label>
              <label className="grid gap-1.5 text-sm font-medium text-zinc-700">Phone<input className="dc-input" value={edit.phone} onChange={(e) => setEdit({ ...edit, phone: e.target.value })} /></label>
              <label className="grid gap-1.5 text-sm font-medium text-zinc-700">Role<select className="dc-input" value={edit.role} onChange={(e) => setEdit({ ...edit, role: e.target.value as Role })}>{roles.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
              <label className="grid gap-1.5 text-sm font-medium text-zinc-700">Trạng thái<select className="dc-input" value={edit.isActive ? "active" : "locked"} onChange={(e) => setEdit({ ...edit, isActive: e.target.value === "active" })}><option value="active">Đang hoạt động</option><option value="locked">Đã khóa</option></select></label>
              <label className="grid gap-1.5 text-sm font-medium text-zinc-700">Lý do chỉnh sửa<input className="dc-input" value={edit.reason} onChange={(e) => setEdit({ ...edit, reason: e.target.value })} /></label>
            </div>
            <section className="mt-4 rounded-2xl border border-zinc-200 p-3 text-sm text-zinc-700">
              <p className="font-semibold text-zinc-900">Thông tin chỉ xem</p>
              <p>Ngày tạo: {new Date(selected.createdAt).toLocaleString("vi-VN")}</p>
              <p>Ví: {(selected.wallet?.pointsBalance ?? 0).toLocaleString("vi-VN")} points • {(selected.wallet?.cashBalanceVnd ?? 0).toLocaleString("vi-VN")} VND</p>
              <p>Creator: {selected.creatorProfile?.displayName ?? "Không có"}</p>
              <p>Brand memberships: {selected.brandMemberships.length}</p>
              <p>Owned brands: {selected.ownedBrands.length}</p>
              <p>Related records: {Object.entries(selected.counts).map(([key, value]) => `${key}: ${value}`).join(" • ")}</p>
            </section>
            <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button type="button" className="dc-btn-secondary" disabled={saving} onClick={() => setSelected(null)}>Hủy</button>
              <button type="submit" className="dc-btn-primary" disabled={saving}>{saving ? "Đang lưu..." : "Lưu thay đổi"}</button>
            </div>
          </form>
        </div>
      ) : null}

      <AdminDeleteDialog
        open={Boolean(deleteTarget)}
        title={`Xóa tài khoản ${deleteTarget?.displayName ?? ""}`}
        confirmationLabel="email hoặc tên tài khoản"
        expectedConfirmation={deleteTarget?.email ?? ""}
        impactUrl={`/api/admin/dashboard/users/${deleteTarget?.id ?? ""}?intent=delete-impact`}
        deleteUrl={`/api/admin/dashboard/users/${deleteTarget?.id ?? ""}`}
        onCancel={() => setDeleteTarget(null)}
        onDeleted={(message) => {
          setDeleteTarget(null);
          setToast(message);
          setTimeout(() => setToast(""), 2500);
          void load();
        }}
      />
      {toast ? <ActionToast message={toast} /> : null}
    </>
  );
}
