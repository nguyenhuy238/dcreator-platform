"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "@phosphor-icons/react";
import { FormField } from "@/app/components/dcreator/ui/base";
import { upsertCurrentBrandInContext } from "@/app/dashboard/brand/_hooks/use-brand-context";

type CreateBrandResponse = {
  success?: boolean;
  data?: {
    id: string;
    name: string;
    status: string;
    created: boolean;
  };
  error?: string;
};

export function AddBrandForm() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setSuccess("");
    setError("");

    const form = event.currentTarget;
    const formData = new FormData(form);
    const brandName = String(formData.get("brandName") ?? "").trim();
    const industry = String(formData.get("industry") ?? "").trim();
    const description = String(formData.get("description") ?? "").trim();
    const website = String(formData.get("website") ?? "").trim();
    const contactName = String(formData.get("contactName") ?? "").trim();
    const contactPhone = String(formData.get("contactPhone") ?? "").trim();
    const contactEmail = String(formData.get("contactEmail") ?? "").trim();

    try {
      const response = await fetch("/api/brand/create", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          brandName,
          industry,
          description,
          website,
          contactName,
          contactPhone,
          contactEmail
        })
      });
      const payload = (await response.json()) as CreateBrandResponse;

      if (!response.ok || !payload.success || !payload.data) {
        throw new Error(payload.error ?? "Không thể tạo Brand.");
      }

      upsertCurrentBrandInContext({
        id: payload.data.id,
        name: payload.data.name,
        role: "OWNER"
      });

      form.reset();
      setSuccess(payload.data.created ? "Đã tạo Brand mới và chuyển sang Brand này." : "Brand đã tồn tại, đã chuyển sang Brand này.");
      router.refresh();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Không thể tạo Brand.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="dc-card p-5">
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-zinc-900">Thêm thương hiệu khác</h2>
          <p className="mt-1 text-sm text-zinc-600">Tạo thêm Brand thuộc tài khoản của bạn, sau đó dùng bộ chọn Brand để chuyển workspace.</p>
        </div>
      </div>

      <form className="grid gap-4" onSubmit={onSubmit}>
        <div className="grid gap-4 md:grid-cols-2">
          <FormField label={<span>Tên thương hiệu <span className="text-red-500">*</span></span>}>
            <input name="brandName" className="dc-input" required minLength={2} maxLength={160} placeholder="Ví dụ: FreshSkin Lab" />
          </FormField>

          <FormField label={<span>Ngành hàng <span className="text-red-500">*</span></span>}>
            <input name="industry" className="dc-input" required minLength={2} maxLength={120} placeholder="F&B, Beauty, Lifestyle..." />
          </FormField>

          <FormField label="Website">
            <input name="website" type="url" className="dc-input" placeholder="https://example.com" />
          </FormField>

          <FormField label="Email liên hệ">
            <input name="contactEmail" type="email" className="dc-input" placeholder="brand@example.com" />
          </FormField>

          <FormField label="Người liên hệ">
            <input name="contactName" className="dc-input" maxLength={160} placeholder="Nguyễn An" />
          </FormField>

          <FormField label="Số điện thoại">
            <input name="contactPhone" className="dc-input" maxLength={40} placeholder="09xx xxx xxx" />
          </FormField>
        </div>

        <FormField label="Mô tả ngắn">
          <textarea name="description" className="dc-input min-h-24" maxLength={300} placeholder="Mô tả ngắn về thương hiệu, nhóm sản phẩm hoặc mục tiêu campaign." />
        </FormField>

        {success ? <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700">{success}</p> : null}
        {error ? <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700">{error}</p> : null}

        <div>
          <button type="submit" className="dc-btn-primary inline-flex items-center gap-2" disabled={isSubmitting}>
            <Plus size={18} weight="bold" />
            {isSubmitting ? "Đang tạo..." : "Thêm Brand"}
          </button>
        </div>
      </form>
    </section>
  );
}
