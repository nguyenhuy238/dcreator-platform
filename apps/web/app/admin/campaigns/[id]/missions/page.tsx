"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { FormEvent, ReactNode, useCallback, useEffect, useState } from "react";
import { ErrorState, LoadingSkeleton, PageHeader, SectionHeader } from "@/app/components/dcreator/ui/base";

type ApiResult<T> = { success: boolean; data?: T; error?: string };
type ProductReceiveOption = "PRODUCT_REQUIRED" | "NO_PRODUCT_REQUIRED";

type MissionItem = {
  id: string;
  title: string;
  description: string;
  audience: "CREATOR" | "USER";
  rewardCommissionVnd: number;
  rewardPoints: number;
  productReceiveOption: ProductReceiveOption;
  productName: string | null;
  productDescription: string | null;
  productLink: string | null;
  productImageUrl: string | null;
  allowRepeat: boolean;
  deadlineAt: string | null;
  status: string;
};

type MissionForm = {
  title: string;
  description: string;
  audience: "CREATOR" | "USER";
  rewardCommissionVnd: number;
  rewardPoints: number;
  productReceiveOption: ProductReceiveOption;
  productName: string;
  productDescription: string;
  productLink: string;
  productImageUrl: string;
  allowRepeat: boolean;
  deadlineAt: string;
};

const defaultForm: MissionForm = {
  title: "",
  description: "",
  audience: "CREATOR",
  rewardCommissionVnd: 0,
  rewardPoints: 0,
  productReceiveOption: "NO_PRODUCT_REQUIRED",
  productName: "",
  productDescription: "",
  productLink: "",
  productImageUrl: "",
  allowRepeat: false,
  deadlineAt: ""
};

function getAudienceLabel(value: MissionItem["audience"]) {
  return value === "CREATOR" ? "Nhà sáng tạo" : "Người dùng";
}

function getProductReceiveOptionLabel(value: ProductReceiveOption) {
  return value === "PRODUCT_REQUIRED" ? "Yêu cầu sản phẩm" : "Không yêu cầu sản phẩm";
}

function getMissionStatusLabel(status: string) {
  const map: Record<string, string> = {
    OPEN: "Đang mở",
    SUBMITTED: "Đã nộp",
    APPROVED: "Đã duyệt",
    REJECTED: "Đã từ chối",
    DRAFT: "Bản nháp",
    PENDING_REVIEW: "Chờ duyệt"
  };
  return map[status] ?? status;
}

function Field({
  label,
  hint,
  children
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <label className="grid gap-1 text-sm text-zinc-700">
      <span className="font-semibold text-zinc-900">{label}</span>
      {children}
      {hint ? <span className="text-xs text-zinc-500">{hint}</span> : null}
    </label>
  );
}

export default function AdminCampaignMissionsPage() {
  const params = useParams<{ id: string }>();
  const campaignId = params?.id;
  const [items, setItems] = useState<MissionItem[]>([]);
  const [form, setForm] = useState<MissionForm>(defaultForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const requiresProduct = form.productReceiveOption === "PRODUCT_REQUIRED";

  const load = useCallback(async () => {
    if (!campaignId) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/campaigns/${campaignId}/missions`, { cache: "no-store" });
      const body = (await res.json()) as ApiResult<MissionItem[]>;
      if (!res.ok || !body.success || !body.data) throw new Error(body.error ?? "Không thể tải nhiệm vụ");
      setItems(body.data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Không thể tải nhiệm vụ");
    } finally {
      setLoading(false);
    }
  }, [campaignId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!campaignId) return;
    setSaving(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/campaigns/${campaignId}/missions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          productName: requiresProduct ? form.productName : "",
          productDescription: requiresProduct ? form.productDescription : "",
          productLink: requiresProduct ? form.productLink : "",
          productImageUrl: requiresProduct ? form.productImageUrl : "",
          deadlineAt: form.deadlineAt ? new Date(form.deadlineAt).toISOString() : undefined
        })
      });
      const body = (await res.json()) as ApiResult<unknown>;
      if (!res.ok || !body.success) throw new Error(body.error ?? "Tạo nhiệm vụ thất bại");
      setForm(defaultForm);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Tạo nhiệm vụ thất bại");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <PageHeader
        title="Quản lý nhiệm vụ"
        subtitle={`Campaign ID: ${campaignId}`}
        action={<Link href={`/admin/campaigns/${campaignId}`} className="dc-btn-secondary">Quay lại campaign</Link>}
      />
      {error ? <ErrorState title="Có lỗi" description={error} onRetry={() => void load()} /> : null}

      <form className="dc-card mt-4 grid gap-4 p-4" onSubmit={submit}>
        <SectionHeader title="Tạo nhiệm vụ mới" subtitle="Campaign hiện chỉ hỗ trợ 1 nhiệm vụ. Vui lòng khai báo đầy đủ thông tin bên dưới." />
        <Field label="Tên nhiệm vụ" hint="Ví dụ: Quay video review 30 giây.">
          <input className="dc-input" placeholder="Nhập tên nhiệm vụ" value={form.title} onChange={(e) => setForm((s) => ({ ...s, title: e.target.value }))} required />
        </Field>
        <Field label="Mô tả chi tiết" hint="Nêu rõ đầu ra cần nộp và tiêu chí duyệt.">
          <textarea className="dc-input min-h-24" placeholder="Nhập mô tả nhiệm vụ" value={form.description} onChange={(e) => setForm((s) => ({ ...s, description: e.target.value }))} required />
        </Field>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          <Field label="Đối tượng thực hiện" hint="Nhà sáng tạo hoặc người dùng.">
            <select className="dc-input" value={form.audience} onChange={(e) => setForm((s) => ({ ...s, audience: e.target.value as MissionForm["audience"] }))}>
              <option value="CREATOR">Nhà sáng tạo</option>
              <option value="USER">Người dùng</option>
            </select>
          </Field>
          <Field label="Yêu cầu sản phẩm" hint="Chọn có yêu cầu sản phẩm hay không.">
            <select className="dc-input" value={form.productReceiveOption} onChange={(e) => setForm((s) => ({ ...s, productReceiveOption: e.target.value as ProductReceiveOption }))}>
              <option value="NO_PRODUCT_REQUIRED">Không yêu cầu sản phẩm</option>
              <option value="PRODUCT_REQUIRED">Yêu cầu sản phẩm</option>
            </select>
          </Field>
          <Field label="Hạn nộp nhiệm vụ" hint="Để trống nếu không giới hạn.">
            <input className="dc-input" type="datetime-local" value={form.deadlineAt} onChange={(e) => setForm((s) => ({ ...s, deadlineAt: e.target.value }))} />
          </Field>
          <Field label="Thưởng hoa hồng (VND)">
            <input className="dc-input" type="number" min={0} placeholder="0" value={form.rewardCommissionVnd} onChange={(e) => setForm((s) => ({ ...s, rewardCommissionVnd: Number(e.target.value || 0) }))} />
          </Field>
          <Field label="Thưởng điểm (Points)">
            <input className="dc-input" type="number" min={0} placeholder="0" value={form.rewardPoints} onChange={(e) => setForm((s) => ({ ...s, rewardPoints: Number(e.target.value || 0) }))} />
          </Field>
          <Field label="Cho phép làm lại">
            <label className="flex min-h-11 items-center gap-2 rounded-xl border border-zinc-200 px-3">
              <input type="checkbox" checked={form.allowRepeat} onChange={(e) => setForm((s) => ({ ...s, allowRepeat: e.target.checked }))} />
              <span>Có thể nhận nhiều lần</span>
            </label>
          </Field>
        </div>

        {requiresProduct ? (
          <div className="grid gap-3 rounded-xl border border-zinc-200 bg-zinc-50 p-3 md:grid-cols-2">
            <Field label="Tên sản phẩm">
              <input className="dc-input" value={form.productName} onChange={(e) => setForm((s) => ({ ...s, productName: e.target.value }))} required={requiresProduct} />
            </Field>
            <Field label="Hình ảnh sản phẩm" hint="Dùng URL `https://...` hoặc `/uploads/...`.">
              <input className="dc-input" value={form.productImageUrl} onChange={(e) => setForm((s) => ({ ...s, productImageUrl: e.target.value }))} required={requiresProduct} />
            </Field>
            <Field label="Link sản phẩm" hint="Link trang sản phẩm để creator tham chiếu." >
              <input className="dc-input" value={form.productLink} onChange={(e) => setForm((s) => ({ ...s, productLink: e.target.value }))} required={requiresProduct} />
            </Field>
            <Field label="Mô tả sản phẩm" hint="Tóm tắt đặc điểm, công dụng hoặc yêu cầu khi review.">
              <textarea className="dc-input min-h-24" value={form.productDescription} onChange={(e) => setForm((s) => ({ ...s, productDescription: e.target.value }))} required={requiresProduct} />
            </Field>
          </div>
        ) : null}

        <button className="dc-btn-primary w-fit" type="submit" disabled={saving}>{saving ? "Đang tạo..." : "Tạo nhiệm vụ"}</button>
      </form>

      <section className="mt-4">
        <SectionHeader title="Danh sách nhiệm vụ" subtitle={`${items.length} nhiệm vụ`} />
        {loading ? <LoadingSkeleton rows={4} /> : (
          <div className="grid gap-3">
            {items.map((item) => (
              <article key={item.id} className="dc-card p-4 text-sm text-zinc-700">
                <p className="font-semibold text-zinc-900">{item.title}</p>
                <p className="mt-1">{item.description}</p>
                <div className="mt-2 grid gap-1 md:grid-cols-2">
                  <p><span className="font-semibold">Đối tượng:</span> {getAudienceLabel(item.audience)}</p>
                  <p><span className="font-semibold">Yêu cầu sản phẩm:</span> {getProductReceiveOptionLabel(item.productReceiveOption)}</p>
                  <p><span className="font-semibold">Thưởng hoa hồng:</span> {item.rewardCommissionVnd.toLocaleString("vi-VN")} VND</p>
                  <p><span className="font-semibold">Thưởng điểm:</span> {item.rewardPoints.toLocaleString("vi-VN")}</p>
                  <p><span className="font-semibold">Cho phép lặp:</span> {item.allowRepeat ? "Có" : "Không"}</p>
                  <p><span className="font-semibold">Trạng thái:</span> {getMissionStatusLabel(item.status)}</p>
                  <p><span className="font-semibold">Hạn nộp:</span> {item.deadlineAt ? new Date(item.deadlineAt).toLocaleString("vi-VN") : "Không giới hạn"}</p>
                </div>
                {item.productReceiveOption === "PRODUCT_REQUIRED" ? (
                  <div className="mt-3 rounded-xl border border-zinc-200 bg-zinc-50 p-3">
                    <p><span className="font-semibold">Tên sản phẩm:</span> {item.productName || "Chưa cập nhật"}</p>
                    <p><span className="font-semibold">Mô tả sản phẩm:</span> {item.productDescription || "Chưa cập nhật"}</p>
                    <p><span className="font-semibold">Link sản phẩm:</span> {item.productLink || "Chưa cập nhật"}</p>
                    <p><span className="font-semibold">Hình ảnh sản phẩm:</span> {item.productImageUrl || "Chưa cập nhật"}</p>
                  </div>
                ) : null}
              </article>
            ))}
          </div>
        )}
      </section>
    </>
  );
}
