"use client";

import { useParams, useRouter } from "next/navigation";
import { FormEvent, useCallback, useEffect, useState } from "react";
import { AdminAvatar } from "@/app/admin/_components/AdminAvatar";
import { AdminDeleteDialog } from "@/app/admin/_components/AdminDeleteDialog";
import { ReviewActionDialog } from "@/app/admin/_components/ReviewActionDialog";
import { ActionToast, ErrorState, LoadingSkeleton, PageHeader, StatusBadge } from "@/app/components/dcreator/ui/base";

type ApiResult<T> = { success: boolean; data: T; error?: string };
type BrandApplicationDetail = {
  id: string;
  status: string;
  brandName: string;
  logoUrl: string | null;
  legalName: string | null;
  industry: string | null;
  website: string | null;
  fanpage: string | null;
  address: string | null;
  contactName: string;
  contactPhone: string;
  contactEmail: string;
  description: string | null;
  businessGoal: string | null;
  taxCode: string | null;
  businessLicenseUrl: string | null;
  productCategories: string | null;
  inventoryDescription: string | null;
  rejectReason: string | null;
  reviewNote: string | null;
  account: { id: string; email: string; displayName: string };
  reviewedBy: { id: string; email: string; displayName: string } | null;
  reviewedAt: string | null;
  createdAt: string;
};

export default function AdminBrandDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = params?.id;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");
  const [item, setItem] = useState<BrandApplicationDetail | null>(null);
  const [acting, setActing] = useState(false);
  const [dialogAction, setDialogAction] = useState<null | "verify" | "risk" | "restrict">(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [edit, setEdit] = useState({
    name: "",
    legalName: "",
    industry: "",
    website: "",
    contactName: "",
    contactPhone: "",
    contactEmail: "",
    taxCode: "",
    productCategories: "",
    inventoryDescription: "",
    isLocked: false,
    reason: ""
  });

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/brands/${id}`, { cache: "no-store" });
      const body = (await res.json()) as ApiResult<BrandApplicationDetail>;
      if (!res.ok || !body.success) throw new Error(body.error ?? "Tải chi tiết thất bại");
      setItem(body.data);
      setEdit({
        name: body.data.brandName,
        legalName: body.data.legalName ?? "",
        industry: body.data.industry ?? "",
        website: body.data.website ?? "",
        contactName: body.data.contactName,
        contactPhone: body.data.contactPhone,
        contactEmail: body.data.contactEmail,
        taxCode: body.data.taxCode ?? "",
        productCategories: body.data.productCategories ?? "",
        inventoryDescription: body.data.inventoryDescription ?? "",
        isLocked: body.data.status === "locked",
        reason: ""
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Tải chi tiết thất bại");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  async function patch(url: string, payload?: unknown, message?: string) {
    setActing(true);
    setError("");
    try {
      const res = await fetch(url, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: payload ? JSON.stringify(payload) : undefined
      });
      const body = (await res.json()) as ApiResult<unknown>;
      if (!res.ok || !body.success) throw new Error(body.error ?? "Thao tác thất bại");
      setToast(message ?? "Thành công");
      setTimeout(() => setToast(""), 2000);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Thao tác thất bại");
    } finally {
      setActing(false);
    }
  }

  async function saveBrand(e: FormEvent) {
    e.preventDefault();
    if (!item) return;
    setActing(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/brands/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: edit.name,
          legalName: edit.legalName || null,
          industry: edit.industry || null,
          website: edit.website || null,
          contactName: edit.contactName,
          contactPhone: edit.contactPhone,
          contactEmail: edit.contactEmail,
          taxCode: edit.taxCode || null,
          productCategories: edit.productCategories || null,
          inventoryDescription: edit.inventoryDescription || null,
          isLocked: edit.isLocked,
          lockReason: edit.isLocked ? edit.reason || item.rejectReason || "Admin update" : null,
          reason: edit.reason || "Admin update"
        })
      });
      const body = (await res.json()) as ApiResult<unknown>;
      if (!res.ok || !body.success) throw new Error(body.error ?? "Cập nhật thất bại");
      setToast("Đã cập nhật Brand");
      setTimeout(() => setToast(""), 2000);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Cập nhật thất bại");
    } finally {
      setActing(false);
    }
  }

  if (loading) {
    return (
      <>
        <PageHeader title="Brand Verification Detail" subtitle="Kiểm tra hồ sơ phục vụ risk/KYB operations." />
        <LoadingSkeleton rows={5} />
      </>
    );
  }

  if (error || !item) {
    return <ErrorState title="Không tải được hồ sơ Brand" description={error || "Lỗi không xác định"} onRetry={() => void load()} />;
  }

  return (
    <>
      <PageHeader title={item.brandName} subtitle={`Account: ${item.account.displayName} (${item.account.email})`} action={<button className="dc-btn-secondary" onClick={() => router.push("/admin/brands")}>Back</button>} />
      {error ? <div className="mb-4"><ErrorState title="Có lỗi thao tác" description={error} onRetry={() => void load()} /></div> : null}
      <section className="dc-card p-4">
        <div className="flex items-center justify-between">
          <p className="font-semibold">Current status</p>
          <StatusBadge status={item.status.toLowerCase()} />
        </div>
        <div className="mt-3 flex items-center gap-3">
          <AdminAvatar name={item.brandName || "Brand"} imageUrl={item.logoUrl} className="h-12 w-12" alt={item.brandName || "Brand logo"} />
          <div className="min-w-0">
            <p className="font-semibold text-zinc-900">{item.brandName}</p>
            <p className="truncate text-sm text-zinc-600">{item.contactEmail}</p>
          </div>
        </div>
        <div className="mt-3 grid gap-2 text-sm text-zinc-700">
          <p>Industry: {item.industry ?? "Không có"}</p>
          <p>Contact: {item.contactName} • {item.contactPhone} • {item.contactEmail}</p>
          <p>Legal name: {item.legalName ?? "Không có"}</p>
          <p>Tax code: {item.taxCode ?? "Không có"}</p>
          <p>Categories: {item.productCategories ?? "Không có"}</p>
          <p>Inventory: {item.inventoryDescription ?? "Không có"}</p>
          {item.businessLicenseUrl ? <p>Business license: <a className="underline" href={item.businessLicenseUrl} target="_blank" rel="noreferrer">{item.businessLicenseUrl}</a></p> : null}
          {item.rejectReason ? <p className="text-red-700">Reject reason: {item.rejectReason}</p> : null}
          {item.reviewNote ? <p>Review note: {item.reviewNote}</p> : null}
        </div>
      </section>

      <section className="mt-4 dc-card p-4">
        <p className="font-semibold">Chỉnh sửa Brand</p>
        <form className="mt-3 grid gap-3 md:grid-cols-2" onSubmit={saveBrand}>
          <label className="grid gap-1.5 text-sm font-medium text-zinc-700">Tên Brand<input className="dc-input" value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} /></label>
          <label className="grid gap-1.5 text-sm font-medium text-zinc-700">Tên pháp lý<input className="dc-input" value={edit.legalName} onChange={(e) => setEdit({ ...edit, legalName: e.target.value })} /></label>
          <label className="grid gap-1.5 text-sm font-medium text-zinc-700">Industry<input className="dc-input" value={edit.industry} onChange={(e) => setEdit({ ...edit, industry: e.target.value })} /></label>
          <label className="grid gap-1.5 text-sm font-medium text-zinc-700">Website<input className="dc-input" value={edit.website} onChange={(e) => setEdit({ ...edit, website: e.target.value })} /></label>
          <label className="grid gap-1.5 text-sm font-medium text-zinc-700">Contact name<input className="dc-input" value={edit.contactName} onChange={(e) => setEdit({ ...edit, contactName: e.target.value })} /></label>
          <label className="grid gap-1.5 text-sm font-medium text-zinc-700">Contact phone<input className="dc-input" value={edit.contactPhone} onChange={(e) => setEdit({ ...edit, contactPhone: e.target.value })} /></label>
          <label className="grid gap-1.5 text-sm font-medium text-zinc-700">Contact email<input className="dc-input" value={edit.contactEmail} onChange={(e) => setEdit({ ...edit, contactEmail: e.target.value })} /></label>
          <label className="grid gap-1.5 text-sm font-medium text-zinc-700">Tax code<input className="dc-input" value={edit.taxCode} onChange={(e) => setEdit({ ...edit, taxCode: e.target.value })} /></label>
          <label className="grid gap-1.5 text-sm font-medium text-zinc-700 md:col-span-2">Product categories<input className="dc-input" value={edit.productCategories} onChange={(e) => setEdit({ ...edit, productCategories: e.target.value })} /></label>
          <label className="grid gap-1.5 text-sm font-medium text-zinc-700 md:col-span-2">Inventory<textarea className="dc-input min-h-24" value={edit.inventoryDescription} onChange={(e) => setEdit({ ...edit, inventoryDescription: e.target.value })} /></label>
          <label className="flex items-center gap-2 text-sm font-medium text-zinc-700"><input type="checkbox" checked={edit.isLocked} onChange={(e) => setEdit({ ...edit, isLocked: e.target.checked })} /> Khóa Brand</label>
          <label className="grid gap-1.5 text-sm font-medium text-zinc-700">Lý do<input className="dc-input" value={edit.reason} onChange={(e) => setEdit({ ...edit, reason: e.target.value })} /></label>
          <div className="md:col-span-2 flex justify-end">
            <button className="dc-btn-primary" disabled={acting} type="submit">{acting ? "Đang lưu..." : "Lưu Brand"}</button>
          </div>
        </form>
      </section>

      <section className="mt-4 dc-card p-4">
        <p className="font-semibold">Risk Decision</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <button className="dc-btn-primary" disabled={acting} onClick={() => setDialogAction("verify")}>
            Xác nhận an toàn cơ bản
          </button>
          <button className="dc-btn-secondary" disabled={acting} onClick={() => setDialogAction("risk")}>
            Gắn cờ rủi ro
          </button>
          <button className="dc-btn-secondary" disabled={acting} onClick={() => setDialogAction("restrict")}>
            Yêu cầu bổ sung
          </button>
          <button className="rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-red-700" disabled={acting} onClick={() => setDeleteOpen(true)}>
            Xóa Brand
          </button>
        </div>
      </section>

      {toast ? <ActionToast message={toast} /> : null}
      <AdminDeleteDialog
        open={deleteOpen}
        title={`Xóa Brand ${item.brandName}`}
        confirmationLabel="tên Brand"
        expectedConfirmation={item.brandName}
        impactUrl={`/api/admin/brands/${item.id}?intent=delete-impact`}
        deleteUrl={`/api/admin/brands/${item.id}`}
        onCancel={() => setDeleteOpen(false)}
        onDeleted={(message) => {
          setToast(message);
          setTimeout(() => setToast(""), 2000);
          router.push("/admin/brands");
        }}
      />
      <ReviewActionDialog
        open={dialogAction === "verify"}
        title="Xác nhận hồ sơ an toàn cơ bản"
        description="Đánh dấu hồ sơ qua kiểm tra cơ bản. Không phải bước mở quyền onboarding."
        confirmLabel="Xác nhận"
        submitting={acting}
        onCancel={() => !acting && setDialogAction(null)}
        onConfirm={() => {
          setDialogAction(null);
          void patch(`/api/admin/brands/${item.id}/verify`, {}, "Brand verification confirmed");
        }}
      />
      <ReviewActionDialog
        open={dialogAction === "risk"}
        title="Gắn cờ rủi ro Brand"
        description="Bắt buộc nhập lý do rủi ro."
        confirmLabel="Gắn cờ"
        requireReason
        reasonPlaceholder="Thông tin pháp lý chưa hợp lệ..."
        submitting={acting}
        onCancel={() => !acting && setDialogAction(null)}
        onConfirm={(reason) => {
          setDialogAction(null);
          void patch(`/api/admin/brands/${item.id}/risk`, { reason }, "Brand risk flagged");
        }}
      />
      <ReviewActionDialog
        open={dialogAction === "restrict"}
        title="Yêu cầu bổ sung hồ sơ Brand"
        description="Bắt buộc nhập nội dung cần bổ sung."
        confirmLabel="Yêu cầu bổ sung"
        requireReason
        reasonPlaceholder="Thiếu hồ sơ bổ sung ngành hàng..."
        submitting={acting}
        onCancel={() => !acting && setDialogAction(null)}
        onConfirm={(reason) => {
          setDialogAction(null);
          void patch(`/api/admin/brands/${item.id}/restrict`, { reason }, "Brand restrictions requested");
        }}
      />
    </>
  );
}
