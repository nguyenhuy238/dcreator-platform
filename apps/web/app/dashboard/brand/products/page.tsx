"use client";

import { FormEvent, useEffect, useState } from "react";
import { EmptyState, ErrorState, LoadingSkeleton, PageHeader, SectionHeader } from "@/app/components/dcreator/ui/base";

type FulfillmentType = "NONE_WAREHOUSE" | "BRAND_FULFILLMENT";
type OpsStatus = "DRAFT" | "PENDING_REVIEW" | "APPROVED" | "REJECTED";

type InventoryBatch = {
  id?: string;
  quantity: number;
  expiryDate: string;
  fulfillmentType: FulfillmentType;
  opsStatus: OpsStatus;
  appraisedValueVnd: number;
  viableMarginPercent: number;
  opsNote: string;
};

type Product = {
  id?: string;
  sku: string;
  name: string;
  description: string;
  imageUrl: string;
  stockQty: number;
  voucherStock: number;
  campaignEligibility: boolean;
  suggestedPriceVnd: number;
  costPriceVnd: number;
  priceVnd: number;
  pricePoints: number;
  returnPolicy: string;
  batches: InventoryBatch[];
};

type ApiResponse<T> = { success: true; data: T } | { success: false; error: string };

const defaultBatch: InventoryBatch = {
  quantity: 0,
  expiryDate: "",
  fulfillmentType: "BRAND_FULFILLMENT",
  opsStatus: "PENDING_REVIEW",
  appraisedValueVnd: 0,
  viableMarginPercent: 0,
  opsNote: ""
};

const defaultProduct: Product = {
  sku: "",
  name: "",
  description: "",
  imageUrl: "",
  stockQty: 0,
  voucherStock: 0,
  campaignEligibility: true,
  suggestedPriceVnd: 0,
  costPriceVnd: 0,
  priceVnd: 0,
  pricePoints: 0,
  returnPolicy: "",
  batches: [{ ...defaultBatch }]
};

function formatCurrency(value: number) {
  return `${value.toLocaleString("vi-VN")}đ`;
}

function onlyDigits(raw: string) {
  return raw.replace(/\D/g, "");
}

function parseNonNegativeInt(raw: string) {
  const digits = onlyDigits(raw);
  if (!digits) return 0;
  return Number.parseInt(digits, 10);
}

function formatIntForInput(value: number) {
  if (!Number.isFinite(value) || value <= 0) return "";
  return value.toLocaleString("vi-VN");
}

function fulfillmentLabel(value: FulfillmentType) {
  return value === "NONE_WAREHOUSE" ? "Gửi kho NONE" : "Brand tự fulfillment";
}

function statusLabel(value: OpsStatus) {
  if (value === "PENDING_REVIEW") return "Chờ OPS thẩm định";
  if (value === "APPROVED") return "Đã duyệt";
  if (value === "REJECTED") return "Từ chối";
  return "Bản nháp";
}

export default function BrandProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [form, setForm] = useState<Product>(defaultProduct);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function loadProducts() {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/brand/dashboard/products", { cache: "no-store" });
      const payload = (await response.json()) as ApiResponse<Product[]>;
      if (!response.ok || !payload.success) {
        throw new Error(payload.success ? "Không thể tải sản phẩm" : payload.error);
      }
      setProducts(payload.data);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Không thể tải sản phẩm");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadProducts();
  }, []);

  function setField<K extends keyof Product>(name: K, value: Product[K]) {
    setForm((current) => ({ ...current, [name]: value }));
  }

  function setBatchField<K extends keyof InventoryBatch>(name: K, value: InventoryBatch[K]) {
    setForm((current) => ({
      ...current,
      batches: [{ ...(current.batches[0] ?? defaultBatch), [name]: value }]
    }));
  }

  async function submitProduct(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");
    const batch = form.batches[0] ?? defaultBatch;
    const payloadBody: Product = {
      ...form,
      stockQty: batch.quantity,
      priceVnd: form.suggestedPriceVnd,
      batches: [{ ...batch, opsStatus: "PENDING_REVIEW" }]
    };

    try {
      const response = await fetch("/api/brand/dashboard/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payloadBody)
      });
      const payload = (await response.json()) as ApiResponse<Product>;
      if (!response.ok || !payload.success) {
        throw new Error(payload.success ? "Không thể lưu sản phẩm" : payload.error);
      }
      setForm(defaultProduct);
      setSuccess("Đã gửi sản phẩm và lô hàng cho OPS thẩm định.");
      await loadProducts();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Không thể lưu sản phẩm");
    } finally {
      setSaving(false);
    }
  }

  async function uploadProductImage(file: File) {
    setUploadingImage(true);
    setError("");
    try {
      const formData = new FormData();
      formData.append("logo", file);
      const response = await fetch("/api/uploads/brand-logo", { method: "POST", body: formData });
      const payload = (await response.json()) as ApiResponse<{ logoUrl: string }>;
      if (!response.ok || !payload.success || !payload.data?.logoUrl) {
        throw new Error(payload.success ? "Không thể tải ảnh sản phẩm" : payload.error);
      }
      setField("imageUrl", payload.data.logoUrl);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Không thể tải ảnh sản phẩm");
    } finally {
      setUploadingImage(false);
    }
  }

  return (
    <>
      
      <>
        <PageHeader
          title="Sản phẩm & lô hàng"
          subtitle="Khai báo sản phẩm, lô hàng, giá vốn và hình thức fulfillment để OPS thẩm định trước khi tạo campaign."
        />
        {error ? <ErrorState title="Không thể xử lý B2" description={error} onRetry={() => void loadProducts()} /> : null}
        {success ? <p className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{success}</p> : null}

        <form className="dc-card mt-6 grid gap-5 p-5" onSubmit={submitProduct}>
          <SectionHeader title="Khai báo sản phẩm" />
          <div className="grid gap-4 md:grid-cols-2">
            <label className="grid gap-2 text-sm font-semibold text-zinc-700">
              Tên sản phẩm
              <input className="dc-input" value={form.name} onChange={(event) => setField("name", event.target.value)} required />
            </label>
            <label className="grid gap-2 text-sm font-semibold text-zinc-700">
              SKU
              <input className="dc-input" value={form.sku} onChange={(event) => setField("sku", event.target.value.toUpperCase().trimStart())} required />
              <span className="text-xs font-medium text-zinc-500">Mã nội bộ sản phẩm, tự động viết hoa.</span>
            </label>
            <label className="grid gap-2 text-sm font-semibold text-zinc-700 md:col-span-2">
              Mô tả sản phẩm
              <textarea className="dc-input min-h-24" value={form.description} onChange={(event) => setField("description", event.target.value)} />
            </label>
            <label className="grid gap-2 text-sm font-semibold text-zinc-700">
              Hình ảnh sản phẩm URL
              <div className="grid gap-2">
                <input className="dc-input bg-white" type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" onChange={(event) => {
                  const file = event.target.files?.[0] ?? null;
                  if (file) void uploadProductImage(file);
                  event.currentTarget.value = "";
                }} disabled={uploadingImage} />
                <input className="dc-input" type="url" value={form.imageUrl} onChange={(event) => setField("imageUrl", event.target.value.trim())} placeholder="https://..." />
              </div>
              <span className="text-xs font-medium text-zinc-500">Nhập URL ảnh đầy đủ, ví dụ `https://...`.</span>
              {uploadingImage ? <span className="text-xs font-medium text-zinc-500">Đang tải ảnh...</span> : null}
              {form.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={form.imageUrl} alt="Product preview" className="h-28 w-full rounded-xl border border-zinc-200 object-cover" />
              ) : null}
            </label>
            <label className="grid gap-2 text-sm font-semibold text-zinc-700">
              Voucher có thể phát hành
              <input
                className="dc-input"
                type="text"
                inputMode="numeric"
                placeholder="0"
                value={formatIntForInput(form.voucherStock)}
                onChange={(event) => setField("voucherStock", parseNonNegativeInt(event.target.value))}
              />
              <span className="text-xs font-medium text-zinc-500">Đơn vị: số lượng voucher (cái).</span>
            </label>
            <label className="grid gap-2 text-sm font-semibold text-zinc-700">
              Giá bán đề xuất
              <input
                className="dc-input"
                type="text"
                inputMode="numeric"
                placeholder="0"
                value={formatIntForInput(form.suggestedPriceVnd)}
                onChange={(event) => setField("suggestedPriceVnd", parseNonNegativeInt(event.target.value))}
              />
              <span className="text-xs font-medium text-zinc-500">Đơn vị: VND, chỉ nhập số.</span>
            </label>
            <label className="grid gap-2 text-sm font-semibold text-zinc-700">
              Giá vốn
              <input
                className="dc-input"
                type="text"
                inputMode="numeric"
                placeholder="0"
                value={formatIntForInput(form.costPriceVnd)}
                onChange={(event) => setField("costPriceVnd", parseNonNegativeInt(event.target.value))}
              />
              <span className="text-xs font-medium text-zinc-500">Đơn vị: VND, giá nhập/giá vốn thực tế.</span>
            </label>
            <label className="grid gap-2 text-sm font-semibold text-zinc-700 md:col-span-2">
              Chính sách đổi trả
              <textarea className="dc-input min-h-20" value={form.returnPolicy} onChange={(event) => setField("returnPolicy", event.target.value)} />
            </label>
          </div>

          <SectionHeader title="Khai báo lô hàng" />
          <div className="grid gap-4 md:grid-cols-2">
            <label className="grid gap-2 text-sm font-semibold text-zinc-700">
              Số lượng lô hàng
              <input
                className="dc-input"
                type="text"
                inputMode="numeric"
                placeholder="0"
                value={formatIntForInput(form.batches[0]?.quantity ?? 0)}
                onChange={(event) => setBatchField("quantity", parseNonNegativeInt(event.target.value))}
              />
              <span className="text-xs font-medium text-zinc-500">Đơn vị: sản phẩm (cái) trong lô.</span>
            </label>
            <label className="grid gap-2 text-sm font-semibold text-zinc-700">
              Hạn sử dụng
              <input className="dc-input" type="date" value={form.batches[0]?.expiryDate ?? ""} onChange={(event) => setBatchField("expiryDate", event.target.value)} />
              <span className="text-xs font-medium text-zinc-500">Trình duyệt có thể hiển thị khác nhau theo locale, dữ liệu lưu chuẩn ISO date.</span>
            </label>
            <label className="grid gap-2 text-sm font-semibold text-zinc-700">
              Hình thức nhập kho
              <select className="dc-input" value={form.batches[0]?.fulfillmentType ?? "BRAND_FULFILLMENT"} onChange={(event) => setBatchField("fulfillmentType", event.target.value as FulfillmentType)}>
                <option value="NONE_WAREHOUSE">Gửi kho NONE</option>
                <option value="BRAND_FULFILLMENT">Brand tự fulfillment</option>
              </select>
            </label>
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-700">
              OPS sẽ thẩm định giá trị lô hàng, biên lợi nhuận khả thi và phản hồi trạng thái sau khi Brand gửi khai báo.
            </div>
          </div>

          <button className="dc-btn-primary w-fit" type="submit" disabled={saving}>
            {saving ? "Đang gửi..." : "Gửi OPS thẩm định"}
          </button>
        </form>

        <section className="mt-8">
          <SectionHeader title="Sản phẩm đã khai báo" />
          {loading ? (
            <LoadingSkeleton rows={4} />
          ) : products.length === 0 ? (
            <EmptyState title="Chưa có sản phẩm" description="Khai báo sản phẩm và lô hàng đầu tiên để bắt đầu bước B2." />
          ) : (
            <div className="grid gap-4">
              {products.map((product) => {
                const batch = product.batches[0];
                return (
                  <article key={product.id ?? product.sku} className="dc-card grid gap-4 p-5 md:grid-cols-[120px_minmax(0,1fr)]">
                    <div className="aspect-square rounded-2xl border border-zinc-200 bg-zinc-100 bg-cover bg-center" style={{ backgroundImage: product.imageUrl ? `url(${product.imageUrl})` : undefined }} />
                    <div className="grid gap-3">
                      <div>
                        <p className="text-xs font-bold uppercase tracking-[0.14em] text-zinc-500">{product.sku}</p>
                        <h2 className="text-xl font-black text-zinc-900">{product.name}</h2>
                        <p className="mt-1 text-sm text-zinc-600">{product.description || "Chưa có mô tả sản phẩm."}</p>
                      </div>
                      <div className="grid gap-2 text-sm text-zinc-600 md:grid-cols-4">
                        <p>Giá đề xuất: <span className="font-bold text-zinc-900">{formatCurrency(product.suggestedPriceVnd)}</span></p>
                        <p>Giá vốn: <span className="font-bold text-zinc-900">{formatCurrency(product.costPriceVnd)}</span></p>
                        <p>Tồn lô: <span className="font-bold text-zinc-900">{batch?.quantity ?? product.stockQty}</span></p>
                        <p>Voucher: <span className="font-bold text-zinc-900">{product.voucherStock}</span></p>
                      </div>
                      <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-3 text-sm text-zinc-600">
                        <p>Fulfillment: <span className="font-semibold text-zinc-900">{batch ? fulfillmentLabel(batch.fulfillmentType) : "Chưa khai báo"}</span></p>
                        <p>Hạn sử dụng: <span className="font-semibold text-zinc-900">{batch?.expiryDate || "Không áp dụng"}</span></p>
                        <p>OPS: <span className="font-semibold text-zinc-900">{batch ? statusLabel(batch.opsStatus) : "Chưa gửi"}</span></p>
                        {batch?.appraisedValueVnd ? <p>Định giá OPS: <span className="font-semibold text-zinc-900">{formatCurrency(batch.appraisedValueVnd)}</span></p> : null}
                        {batch?.viableMarginPercent ? <p>Biên lợi nhuận khả thi: <span className="font-semibold text-zinc-900">{batch.viableMarginPercent}%</span></p> : null}
                      </div>
                      <p className="text-sm text-zinc-600">Chính sách đổi trả: {product.returnPolicy || "Chưa khai báo."}</p>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </>
    </>
  );
}





