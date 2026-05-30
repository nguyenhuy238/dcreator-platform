"use client";

import { FormEvent, useEffect, useState } from "react";
import { ActionToast, EmptyState, ErrorState, LoadingSkeleton, PageHeader, SectionHeader, StatusBadge } from "@/app/components/dcreator/ui/base";

type Member = {
  id: string;
  accountId: string;
  role: "OWNER" | "MANAGER" | "STAFF";
  status: "ACTIVE" | "DISABLED";
  joinedAt: string;
  user: { displayName: string; email: string };
};

type Payload = {
  canManage: boolean;
  brand: { id: string; name: string; ownerAccountId: string };
  members: Member[];
};

type ApiResponse<T> = { success: boolean; data?: T; error?: string };

export default function BrandMembersPage() {
  const [data, setData] = useState<Payload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");

  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"OWNER" | "MANAGER" | "STAFF">("STAFF");

  async function load() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/brand/dashboard/members", { cache: "no-store" });
      const payload = (await res.json()) as ApiResponse<Payload>;
      if (!res.ok || !payload.success || !payload.data) throw new Error(payload.error ?? "Không thể tải thành viên brand");
      setData(payload.data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Không thể tải thành viên brand");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function invite(event: FormEvent) {
    event.preventDefault();
    try {
      const res = await fetch("/api/brand/dashboard/members", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, role, note: "Mời từ Brand Dashboard" })
      });
      const payload = (await res.json()) as ApiResponse<unknown>;
      if (!res.ok || !payload.success) throw new Error(payload.error ?? "Mời thành viên thất bại");
      setEmail("");
      setRole("STAFF");
      setToast("Đã mời/thêm thành viên thành công.");
      setTimeout(() => setToast(""), 2200);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Mời thành viên thất bại");
    }
  }

  async function updateRole(memberId: string, nextRole: "OWNER" | "MANAGER" | "STAFF") {
    try {
      const res = await fetch("/api/brand/dashboard/members", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ memberId, role: nextRole })
      });
      const payload = (await res.json()) as ApiResponse<unknown>;
      if (!res.ok || !payload.success) throw new Error(payload.error ?? "Cập nhật role thất bại");
      setToast("Đã cập nhật vai trò thành viên.");
      setTimeout(() => setToast(""), 2200);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Cập nhật role thất bại");
    }
  }

  async function remove(memberId: string) {
    if (!window.confirm("Xác nhận vô hiệu hoá/xoá thành viên này?")) return;
    try {
      const res = await fetch("/api/brand/dashboard/members", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ memberId })
      });
      const payload = (await res.json()) as ApiResponse<unknown>;
      if (!res.ok || !payload.success) throw new Error(payload.error ?? "Xoá thành viên thất bại");
      setToast("Đã xoá thành viên.");
      setTimeout(() => setToast(""), 2200);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Xoá thành viên thất bại");
    }
  }

  return (
    <>
      <PageHeader title="Thành viên Brand" subtitle="Quản lý danh sách thành viên và vai trò trong nhãn hàng." />

      {error ? <ErrorState title="Không thể tải thành viên" description={error} onRetry={() => void load()} /> : null}
      {loading ? <LoadingSkeleton rows={4} /> : null}

      {!loading && data ? (
        <>
          <section className="dc-card p-4">
            <SectionHeader title={`Nhãn hàng: ${data.brand.name}`} subtitle={`Tổng thành viên: ${data.members.length}`} />
            <form onSubmit={invite} className="grid gap-2 md:grid-cols-4">
              <input className="dc-input md:col-span-2" placeholder="Email thành viên" value={email} onChange={(e) => setEmail(e.target.value)} required disabled={!data.canManage} />
              <select className="dc-input" value={role} onChange={(e) => setRole(e.target.value as "OWNER" | "MANAGER" | "STAFF")} disabled={!data.canManage}>
                <option value="STAFF">STAFF</option>
                <option value="MANAGER">MANAGER</option>
                <option value="OWNER">OWNER</option>
              </select>
              <button className="dc-btn-primary" type="submit" disabled={!data.canManage}>Mời thành viên</button>
            </form>
            {!data.canManage ? <p className="mt-2 text-sm text-amber-700">Bạn không có quyền quản lý thành viên (chỉ OWNER được phép).</p> : null}
          </section>

          <section className="mt-6">
            <SectionHeader title="Danh sách thành viên" />
            {data.members.length === 0 ? (
              <EmptyState title="Chưa có thành viên" description="Hiện tại brand chỉ có owner. Hãy mời thêm STAFF để cộng tác vận hành." />
            ) : (
              <div className="grid gap-3">
                {data.members.map((member) => {
                  const isOwnerAccount = member.accountId === data.brand.ownerAccountId;
                  return (
                    <article key={member.id} className="dc-card p-4">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <p className="font-semibold text-zinc-900">{member.user.displayName}</p>
                          <p className="text-sm text-zinc-600">{member.user.email}</p>
                        </div>
                        <div className="flex gap-2">
                          <StatusBadge status={member.role} />
                          <StatusBadge status={member.status} />
                        </div>
                      </div>
                      <p className="mt-1 text-sm text-zinc-600">Ngày tham gia: {new Date(member.joinedAt).toLocaleDateString("vi-VN")}</p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <button
                          className="dc-btn-secondary"
                          disabled={!data.canManage || isOwnerAccount}
                          onClick={() => void updateRole(member.id, member.role === "STAFF" ? "MANAGER" : "STAFF")}
                        >
                          Đổi role
                        </button>
                        <button className="dc-btn-secondary" disabled={!data.canManage || isOwnerAccount} onClick={() => void remove(member.id)}>Vô hiệu hoá / xoá</button>
                      </div>
                      {isOwnerAccount ? <p className="mt-1 text-xs text-zinc-500">Owner cuối cùng không thể bị xoá hoặc hạ quyền.</p> : null}
                    </article>
                  );
                })}
              </div>
            )}
          </section>
        </>
      ) : null}

      {toast ? <ActionToast message={toast} /> : null}
    </>
  );
}
