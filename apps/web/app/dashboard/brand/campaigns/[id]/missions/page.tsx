"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { FormEvent, ReactNode, useEffect, useState } from "react";
import { ErrorState, LoadingSkeleton, PageHeader, SectionHeader } from "@/app/components/dcreator/ui/base";

type ApiResult<T> = { success: boolean; data?: T; error?: string };
type MissionItem = {
  id: string;
  title: string;
  description: string;
  audience: "CREATOR" | "USER";
  rewardCommissionVnd: number;
  rewardPoints: number;
  productReceiveOption: "DEPOSIT_PRODUCT" | "CREATOR_BUY_FIRST" | "NO_PRODUCT_REQUIRED";
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
  productReceiveOption: "DEPOSIT_PRODUCT" | "CREATOR_BUY_FIRST" | "NO_PRODUCT_REQUIRED";
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
  allowRepeat: false,
  deadlineAt: ""
};

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

export default function BrandCampaignMissionsPage() {
  const params = useParams<{ id: string }>();
  const campaignId = params?.id;
  const [items, setItems] = useState<MissionItem[]>([]);
  const [form, setForm] = useState<MissionForm>(defaultForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function load() {
    if (!campaignId) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/brand/dashboard/campaigns/${campaignId}/missions`, { cache: "no-store" });
      const body = (await res.json()) as ApiResult<MissionItem[]>;
      if (!res.ok || !body.success || !body.data) throw new Error(body.error ?? "Không thể tải mission");
      setItems(body.data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Không thể tải mission");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, [campaignId]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!campaignId) return;
    setSaving(true);
    setError("");
    try {
      const res = await fetch(`/api/brand/dashboard/campaigns/${campaignId}/missions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          deadlineAt: form.deadlineAt ? new Date(form.deadlineAt).toISOString() : undefined
        })
      });
      const body = (await res.json()) as ApiResult<unknown>;
      if (!res.ok || !body.success) throw new Error(body.error ?? "Tạo mission thất bại");
      setForm(defaultForm);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Tạo mission thất bại");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <PageHeader
        title="Quản lý Mission / Job"
        subtitle={`Campaign ID: ${campaignId}`}
        action={<Link href="/dashboard/brand/campaigns" className="dc-btn-secondary">Quay lại campaign</Link>}
      />
      {error ? <ErrorState title="Có lỗi" description={error} onRetry={() => void load()} /> : null}

      <form className="dc-card mt-4 grid gap-4 p-4" onSubmit={submit}>
        <SectionHeader title="Tạo mission mới" subtitle="Khai báo đầy đủ thông tin nhiệm vụ để creator/user dễ thực hiện và brand dễ theo dõi." />
        <Field label="Tên mission / job" hint="Tên ngắn gọn, mô tả rõ hành động chính. Ví dụ: Review sản phẩm 30s.">
          <input className="dc-input" placeholder="Nhập tên mission" value={form.title} onChange={(e) => setForm((s) => ({ ...s, title: e.target.value }))} required />
        </Field>
        <Field label="Mô tả chi tiết" hint="Nêu yêu cầu đầu ra, tiêu chí duyệt, định dạng nội dung cần nộp.">
          <textarea className="dc-input min-h-24" placeholder="Nhập mô tả mission" value={form.description} onChange={(e) => setForm((s) => ({ ...s, description: e.target.value }))} required />
        </Field>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          <Field label="Đối tượng thực hiện (Audience)" hint="CREATOR: dành cho creator. USER: dành cho người dùng thường.">
            <select className="dc-input" value={form.audience} onChange={(e) => setForm((s) => ({ ...s, audience: e.target.value as "CREATOR" | "USER" }))}>
              <option value="CREATOR">CREATOR</option>
              <option value="USER">USER</option>
            </select>
          </Field>
          <Field label="Cách nhận sản phẩm" hint="Chọn luồng nhận/mua sản phẩm trước khi làm nhiệm vụ.">
            <select className="dc-input" value={form.productReceiveOption} onChange={(e) => setForm((s) => ({ ...s, productReceiveOption: e.target.value as MissionForm["productReceiveOption"] }))}>
              <option value="NO_PRODUCT_REQUIRED">NO_PRODUCT_REQUIRED</option>
              <option value="DEPOSIT_PRODUCT">DEPOSIT_PRODUCT</option>
              <option value="CREATOR_BUY_FIRST">CREATOR_BUY_FIRST</option>
            </select>
          </Field>
          <Field label="Hạn nộp nhiệm vụ (Deadline)" hint="Để trống nếu không giới hạn thời gian. Nếu có, phải nằm trong timeline campaign.">
            <input className="dc-input" type="datetime-local" value={form.deadlineAt} onChange={(e) => setForm((s) => ({ ...s, deadlineAt: e.target.value }))} />
          </Field>
          <Field label="Thưởng hoa hồng (VND)" hint="Số tiền thưởng cho mỗi nhiệm vụ hoàn thành (đơn vị VND).">
            <input className="dc-input" type="number" min={0} placeholder="0" value={form.rewardCommissionVnd} onChange={(e) => setForm((s) => ({ ...s, rewardCommissionVnd: Number(e.target.value || 0) }))} />
          </Field>
          <Field label="Thưởng điểm (Points)" hint="Điểm thưởng cộng thêm cho người hoàn thành nhiệm vụ.">
            <input className="dc-input" type="number" min={0} placeholder="0" value={form.rewardPoints} onChange={(e) => setForm((s) => ({ ...s, rewardPoints: Number(e.target.value || 0) }))} />
          </Field>
          <Field label="Cho phép làm lại" hint="Bật nếu một người được phép nhận/làm nhiệm vụ nhiều lần.">
            <label className="flex min-h-11 items-center gap-2 rounded-xl border border-zinc-200 px-3">
              <input type="checkbox" checked={form.allowRepeat} onChange={(e) => setForm((s) => ({ ...s, allowRepeat: e.target.checked }))} />
              <span>Allow repeat</span>
            </label>
          </Field>
        </div>
        <button className="dc-btn-primary w-fit" type="submit" disabled={saving}>{saving ? "Đang tạo..." : "Tạo mission/job"}</button>
      </form>

      <section className="mt-4">
        <SectionHeader title="Danh sách mission/job" subtitle={`${items.length} mission`} />
        {loading ? <LoadingSkeleton rows={4} /> : (
          <div className="grid gap-3">
            {items.map((item) => (
              <article key={item.id} className="dc-card p-4 text-sm text-zinc-700">
                <p className="font-semibold text-zinc-900">{item.title}</p>
                <p className="mt-1">{item.description}</p>
                <div className="mt-2 grid gap-1 md:grid-cols-2">
                  <p><span className="font-semibold">Đối tượng:</span> {item.audience}</p>
                  <p><span className="font-semibold">Nhận sản phẩm:</span> {item.productReceiveOption}</p>
                  <p><span className="font-semibold">Thưởng hoa hồng:</span> {item.rewardCommissionVnd.toLocaleString("vi-VN")} VND</p>
                  <p><span className="font-semibold">Thưởng điểm:</span> {item.rewardPoints.toLocaleString("vi-VN")}</p>
                  <p><span className="font-semibold">Cho phép lặp:</span> {item.allowRepeat ? "Có" : "Không"}</p>
                  <p><span className="font-semibold">Trạng thái:</span> {item.status}</p>
                  <p><span className="font-semibold">Deadline:</span> {item.deadlineAt ? new Date(item.deadlineAt).toLocaleString("vi-VN") : "Không giới hạn"}</p>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </>
  );
}
