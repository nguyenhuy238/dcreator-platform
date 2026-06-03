"use client";

import { ChangeEvent, FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { EmptyState, ErrorState, LoadingSkeleton, PageHeader, SectionHeader, StatusBadge } from "@/app/components/dcreator/ui/base";
import { useCurrentBrand } from "@/app/dashboard/brand/_hooks/use-brand-context";

type ProductItem = {
  id: string;
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
  batches?: Array<{
    id: string;
    quantity: number;
    expiryDate: string;
    fulfillmentType: "NONE_WAREHOUSE" | "BRAND_FULFILLMENT";
    opsStatus: "DRAFT" | "PENDING_REVIEW" | "APPROVED" | "REJECTED";
    appraisedValueVnd: number;
    viableMarginPercent: number;
    opsNote: string;
  }>;
};

type ProductForm = {
  sku: string;
  name: string;
  productGroup: string;
  collection: string;
  material: string;
  color: string;
  expiryDate: string;
  description: string;
  imageUrl: string;
  stockQty: string;
  voucherStock: string;
  costPriceVnd: string;
  priceVnd: string;
  pricePoints: string;
  returnPolicy: string;
  variants: ProductVariantForm[];
  campaignEligibility: boolean;
};

type ProductVariantForm = {
  id: string;
  name: string;
  sku: string;
  imageUrl: string;
  stockQty: string;
  priceVnd: string;
};

type ApiResponse<T> = { success: boolean; data?: T; error?: string };

function createEmptyVariant(): ProductVariantForm {
  return {
    id: crypto.randomUUID(),
    name: "",
    sku: "",
    imageUrl: "",
    stockQty: "0",
    priceVnd: "0"
  };
}

const initialForm: ProductForm = {
  sku: "",
  name: "",
  productGroup: "",
  collection: "",
  material: "",
  color: "",
  expiryDate: "",
  description: "",
  imageUrl: "",
  stockQty: "0",
  voucherStock: "0",
  costPriceVnd: "0",
  priceVnd: "0",
  pricePoints: "0",
  returnPolicy: "",
  variants: [createEmptyVariant()],
  campaignEligibility: true
};

function formatVnd(value: number) {
  return `${value.toLocaleString("vi-VN")} VND`;
}

function toNumber(value: string) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? Math.floor(parsed) : 0;
}

function buildProductDescription(input: ProductForm) {
  return [
    input.description.trim() ? input.description.trim() : "",
    input.productGroup.trim() ? `Group: ${input.productGroup.trim()}` : "",
    input.collection.trim() ? `Bộ sưu tập: ${input.collection.trim()}` : "",
    input.material.trim() ? `Chất liệu: ${input.material.trim()}` : "",
    input.color.trim() ? `Màu sắc: ${input.color.trim()}` : "",
    input.expiryDate.trim() ? `Hạn sử dụng: ${input.expiryDate.trim()}` : ""
  ].filter(Boolean).join("\n");
}

export default function BrandProductsPage() {
  const { currentBrandId, currentBrand } = useCurrentBrand();
  const [items, setItems] = useState<ProductItem[]>([]);
  const [form, setForm] = useState<ProductForm>(initialForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingImageKey, setUploadingImageKey] = useState("");
  const [previewImageUrl, setPreviewImageUrl] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const variantStockTotal = useMemo(
    () => form.variants.reduce((sum, variant) => sum + toNumber(variant.stockQty), 0),
    [form.variants]
  );

  const productsApiPath = useMemo(() => {
    if (!currentBrandId) return "/api/brand/dashboard/products";
    return `/api/brand/dashboard/products?brandId=${encodeURIComponent(currentBrandId)}`;
  }, [currentBrandId]);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    setSuccess("");
    try {
      const response = await fetch(productsApiPath, { cache: "no-store" });
      const payload = (await response.json()) as ApiResponse<ProductItem[]>;
      if (!response.ok || !payload.success || !payload.data) {
        throw new Error(payload.error ?? "Không thể tải danh sách sản phẩm");
      }
      setItems(payload.data);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Không thể tải danh sách sản phẩm");
    } finally {
      setLoading(false);
    }
  }, [productsApiPath]);

  useEffect(() => {
    void load();
  }, [load]);

  function setField<Key extends keyof ProductForm>(key: Key, value: ProductForm[Key]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function getVariantNote(input: ProductVariantForm) {
    return [
      input.name.trim() ? `Variant: ${input.name.trim()}` : "",
      input.sku.trim() ? `Variant SKU: ${input.sku.trim()}` : "",
      input.imageUrl.trim() ? `Ảnh: ${input.imageUrl.trim()}` : ""
    ].filter(Boolean).join(" | ");
  }

  function setVariantField<Key extends keyof ProductVariantForm>(variantId: string, key: Key, value: ProductVariantForm[Key]) {
    setForm((current) => ({
      ...current,
      variants: current.variants.map((variant) => variant.id === variantId ? { ...variant, [key]: value } : variant)
    }));
  }

  async function uploadImage(file: File, target: "product" | "variant", variantId?: string) {
    const uploadKey = target === "product" ? "product" : `variant:${variantId}`;
    setUploadingImageKey(uploadKey);
    setError("");
    setSuccess("");
    try {
      const uploadData = new FormData();
      uploadData.append("logo", file);
      const response = await fetch("/api/uploads/brand-logo", { method: "POST", body: uploadData });
      const payload = (await response.json()) as ApiResponse<{ logoUrl?: string }>;
      const imageUrl = payload.data?.logoUrl;
      if (!response.ok || !payload.success || !imageUrl) {
        throw new Error(payload.error ?? "Không thể tải ảnh lên");
      }
      if (target === "product") {
        setField("imageUrl", imageUrl);
      } else if (variantId) {
        setVariantField(variantId, "imageUrl", imageUrl);
      }
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Không thể tải ảnh lên");
    } finally {
      setUploadingImageKey("");
    }
  }

  function onProductImageChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (file) void uploadImage(file, "product");
  }

  function onVariantImageChange(variantId: string, event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (file) void uploadImage(file, "variant", variantId);
  }

  function addVariant() {
    setForm((current) => ({ ...current, variants: [...current.variants, createEmptyVariant()] }));
  }

  function removeVariant(variantId: string) {
    setForm((current) => ({
      ...current,
      variants: current.variants.length <= 1 ? current.variants : current.variants.filter((variant) => variant.id !== variantId)
    }));
  }

  async function submitProduct(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const response = await fetch(productsApiPath, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sku: form.sku.trim(),
          name: form.name.trim(),
          description: buildProductDescription(form),
          imageUrl: form.imageUrl.trim(),
          stockQty: variantStockTotal,
          voucherStock: variantStockTotal,
          costPriceVnd: toNumber(form.costPriceVnd),
          priceVnd: toNumber(form.priceVnd),
          suggestedPriceVnd: toNumber(form.priceVnd),
          pricePoints: toNumber(form.pricePoints),
          campaignEligibility: form.campaignEligibility,
          returnPolicy: form.returnPolicy.trim(),
          batches: form.variants
            .filter((variant) => getVariantNote(variant) || toNumber(variant.stockQty) > 0)
            .map((variant) => ({
                quantity: toNumber(variant.stockQty),
                fulfillmentType: "BRAND_FULFILLMENT",
                opsStatus: "DRAFT",
                appraisedValueVnd: toNumber(variant.priceVnd),
                viableMarginPercent: 0,
                opsNote: getVariantNote(variant)
              }))
        })
      });
      const payload = (await response.json()) as ApiResponse<ProductItem>;
      if (!response.ok || !payload.success) {
        throw new Error(payload.error ?? "Không thể lưu sản phẩm");
      }
      setForm(initialForm);
      setSuccess("Đã lưu sản phẩm cho Brand hiện tại.");
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Không thể lưu sản phẩm");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <PageHeader
        title="Sản phẩm / SKU / Variant"
        subtitle={`Quản lý sản phẩm riêng cho ${currentBrand?.name ?? "Brand hiện tại"}.`}
      />

      {error ? <ErrorState title="Không thể xử lý sản phẩm" description={error} onRetry={() => void load()} /> : null}
      {success ? <p className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{success}</p> : null}

      <section className="dc-card p-4 lg:p-5">
        <SectionHeader title="Thêm / cập nhật SKU" subtitle="SKU trùng trong cùng Brand sẽ được cập nhật." />
        <form className="grid gap-4" onSubmit={submitProduct}>
          <div className="grid gap-5 2xl:grid-cols-[minmax(0,1.25fr)_minmax(360px,0.75fr)] xl:grid-cols-[minmax(0,1.15fr)_minmax(340px,0.85fr)]">
          <section className="order-2 rounded-2xl border border-zinc-200 bg-white p-4 xl:order-2">
          <SectionHeader title="PRODUCT INFORMATION" />
          <div className="grid gap-3">
            <label className="grid gap-1 text-sm font-semibold text-zinc-700">
              <span>Product ID <span className="text-red-500">*</span></span>
              <input className="dc-input" required value={form.sku} onChange={(event) => setField("sku", event.target.value)} />
            </label>
            <label className="grid gap-1 text-sm font-semibold text-zinc-700">
              <span>Product name <span className="text-red-500">*</span></span>
              <input className="dc-input" required value={form.name} onChange={(event) => setField("name", event.target.value)} />
            </label>
            <label className="grid gap-1 text-sm font-semibold text-zinc-700">
              Group
              <select className="dc-input bg-white" value={form.productGroup} onChange={(event) => setField("productGroup", event.target.value)}>
                <option value="">Choose</option>
                <option value="Mỹ phẩm">Mỹ phẩm</option>
                <option value="Thời trang">Thời trang</option>
                <option value="Thực phẩm">Thực phẩm</option>
                <option value="Lifestyle">Lifestyle</option>
              </select>
            </label>
            <label className="grid gap-1 text-sm font-semibold text-zinc-700">
              Bộ sưu tập
              <select className="dc-input bg-white" value={form.collection} onChange={(event) => setField("collection", event.target.value)}>
                <option value="">Choose</option>
                <option value="New collection">New collection</option>
                <option value="Best seller">Best seller</option>
                <option value="Campaign reward">Campaign reward</option>
              </select>
            </label>
            <label className="grid gap-1 text-sm font-semibold text-zinc-700">
              Chất liệu
              <input className="dc-input" value={form.material} onChange={(event) => setField("material", event.target.value)} />
            </label>
            <label className="grid gap-1 text-sm font-semibold text-zinc-700">
              Màu sắc
              <input className="dc-input" value={form.color} onChange={(event) => setField("color", event.target.value)} />
            </label>
            <label className="grid gap-1 text-sm font-semibold text-zinc-700">
              Hạn sử dụng
              <input className="dc-input" type="date" value={form.expiryDate} onChange={(event) => setField("expiryDate", event.target.value)} />
            </label>
            <label className="grid gap-1 text-sm font-semibold text-zinc-700">
              Mô tả
              <textarea className="dc-input min-h-24" value={form.description} onChange={(event) => setField("description", event.target.value)} />
            </label>
            <div className="grid gap-1 text-sm font-semibold text-zinc-700">
              Product pictures
              <input id="product-picture-upload" className="sr-only" type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" onChange={onProductImageChange} disabled={uploadingImageKey === "product"} />
              <div className="mt-1 overflow-hidden rounded-xl border border-dashed border-zinc-300 bg-zinc-50">
                {form.imageUrl ? (
                  <button type="button" className="block w-full cursor-zoom-in" onClick={() => setPreviewImageUrl(form.imageUrl)}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={form.imageUrl} alt={form.name || "Ảnh sản phẩm"} className="h-44 w-full object-cover" />
                  </button>
                ) : (
                  <label htmlFor="product-picture-upload" className="flex h-44 cursor-pointer items-center justify-center px-4 text-center text-sm text-zinc-500 hover:bg-zinc-100">
                    {uploadingImageKey === "product" ? "Đang tải ảnh sản phẩm..." : "Click để upload ảnh sản phẩm"}
                  </label>
                )}
                {form.imageUrl ? (
                  <label htmlFor="product-picture-upload" className="block cursor-pointer border-t border-zinc-200 bg-white px-3 py-2 text-center text-xs font-semibold text-zinc-500 hover:bg-zinc-50">
                    {uploadingImageKey === "product" ? "Đang tải ảnh sản phẩm..." : "Click để đổi ảnh"}
                  </label>
                ) : null}
              </div>
            </div>
          </div>
          </section>

          <section className="order-1 rounded-2xl border border-zinc-200 bg-zinc-50 p-4 xl:order-1">
            <SectionHeader
              title="PRODUCT ITEM"
              action={<button type="button" className="dc-btn-secondary" onClick={addVariant}>Thêm variant</button>}
            />
            <div className="overflow-x-auto rounded-2xl border border-zinc-200 bg-white">
              <div className="grid min-w-[680px] grid-cols-[84px_1.25fr_0.9fr_96px_120px_44px] bg-zinc-50 px-3 py-3 text-xs font-bold uppercase tracking-wide text-zinc-600">
                <div>Picture</div>
                <div>Variant Name</div>
                <div>SKU</div>
                <div>Stock</div>
                <div>Price</div>
                <div />
              </div>
              {form.variants.map((variant, index) => (
                <div key={variant.id} className="grid min-w-[680px] grid-cols-[84px_1.25fr_0.9fr_96px_120px_44px] items-start gap-3 border-t border-zinc-100 px-3 py-3">
                  <label className="block">
                    <input className="sr-only" type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" onChange={(event) => onVariantImageChange(variant.id, event)} disabled={uploadingImageKey === `variant:${variant.id}`} />
                    <span className="flex h-14 w-14 cursor-pointer items-center justify-center overflow-hidden rounded-xl border border-zinc-200 bg-white text-xs font-semibold text-zinc-500 hover:bg-zinc-50">
                      {variant.imageUrl ? (
                        <>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={variant.imageUrl} alt={variant.name || `Variant ${index + 1}`} className="h-full w-full object-cover" />
                        </>
                      ) : uploadingImageKey === `variant:${variant.id}` ? (
                        "Đang tải"
                      ) : (
                        "Ảnh"
                      )}
                    </span>
                  </label>
                  <input className="dc-input" value={variant.name} onChange={(event) => setVariantField(variant.id, "name", event.target.value)} placeholder="Size / Color / ..." />
                  <input className="dc-input" value={variant.sku} onChange={(event) => setVariantField(variant.id, "sku", event.target.value)} placeholder="SKU" />
                  <input className="dc-input" type="number" min={0} value={variant.stockQty === "0" ? "" : variant.stockQty} onChange={(event) => setVariantField(variant.id, "stockQty", event.target.value || "0")} placeholder="Stock" />
                  <input
                    className="dc-input"
                    type="number"
                    inputMode="numeric"
                    min={0}
                    step={1000}
                    value={variant.priceVnd === "0" ? "" : variant.priceVnd}
                    onChange={(event) => setVariantField(variant.id, "priceVnd", event.target.value || "0")}
                    placeholder="Price"
                  />
                  <button type="button" className="h-10 rounded-lg text-lg font-bold text-red-500 hover:bg-red-50 disabled:opacity-30" onClick={() => removeVariant(variant.id)} disabled={form.variants.length <= 1} aria-label={`Xóa variant ${index + 1}`}>
                    ×
                  </button>
                </div>
              ))}
            </div>
            <button type="button" className="mt-3 text-sm font-semibold text-amber-600 hover:text-amber-700" onClick={addVariant}>
              + Add Variant
            </button>
          </section>
          </div>
          <label className="inline-flex items-center gap-2 text-sm font-semibold text-zinc-700">
            <input type="checkbox" checked={form.campaignEligibility} onChange={(event) => setField("campaignEligibility", event.target.checked)} />
            Có thể dùng làm reward/campaign capital
          </label>
          <button className="dc-btn-primary w-fit" type="submit" disabled={saving || Boolean(uploadingImageKey)}>
            {saving ? "Đang lưu..." : "Lưu sản phẩm"}
          </button>
        </form>
      </section>

      <section className="mt-6">
        <SectionHeader title="Danh sách sản phẩm" subtitle={`${items.length} SKU`} />
        {loading ? <LoadingSkeleton rows={4} /> : null}
        {!loading && items.length === 0 ? (
          <EmptyState title="Chưa có sản phẩm" description="Thêm SKU đầu tiên cho Brand hiện tại." />
        ) : null}
        {!loading && items.length > 0 ? (
          <div className="grid gap-4 lg:grid-cols-2">
            {items.map((item) => (
              <article key={item.id} className="dc-card p-4">
                {item.imageUrl ? (
                  <div className="mb-3 overflow-hidden rounded-xl border border-zinc-200 bg-zinc-100">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={item.imageUrl} alt={item.name} className="h-36 w-full object-cover" />
                  </div>
                ) : null}
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">{item.sku}</p>
                    <h2 className="mt-1 text-lg font-bold text-zinc-900">{item.name}</h2>
                  </div>
                  <StatusBadge status={item.campaignEligibility ? "AVAILABLE" : "INACTIVE"} />
                </div>
                <p className="mt-3 text-sm text-zinc-600">{item.description || "Chưa có mô tả."}</p>
                <div className="mt-4 grid gap-2 text-sm text-zinc-600 sm:grid-cols-2">
                  <p>Tổng tồn kho variant: <span className="font-semibold text-zinc-900">{item.stockQty}</span></p>
                  <p>Voucher stock: <span className="font-semibold text-zinc-900">{item.voucherStock}</span></p>
                  <p>Giá vốn: <span className="font-semibold text-zinc-900">{formatVnd(item.costPriceVnd)}</span></p>
                  <p>Giá VND: <span className="font-semibold text-zinc-900">{formatVnd(item.priceVnd)}</span></p>
                  <p>Giá N-Point: <span className="font-semibold text-zinc-900">{item.pricePoints.toLocaleString("vi-VN")}</span></p>
                </div>
                {item.returnPolicy ? <p className="mt-3 text-sm text-zinc-600">Đổi/trả: {item.returnPolicy}</p> : null}
                {item.batches?.length ? (
                  <div className="mt-4 rounded-2xl border border-zinc-200 bg-zinc-50 p-3">
                    <p className="text-sm font-bold text-zinc-900">Variant / lô hàng</p>
                    <div className="mt-2 grid gap-2">
                      {item.batches.map((batch) => (
                        <div key={batch.id} className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-600">
                          <p className="font-semibold text-zinc-900">{batch.opsNote || "Variant chưa đặt tên"}</p>
                          <p>Tồn kho variant: {batch.quantity}</p>
                          <p>Giá variant: {formatVnd(batch.appraisedValueVnd)}</p>
                          <p>Fulfillment: {batch.fulfillmentType}</p>
                          <p>Trạng thái: {batch.opsStatus}</p>
                          {batch.expiryDate ? <p>Hạn dùng: {batch.expiryDate}</p> : null}
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}
              </article>
            ))}
          </div>
        ) : null}
      </section>
      {previewImageUrl ? (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4" role="dialog" aria-modal="true" onClick={() => setPreviewImageUrl("")}>
          <div className="relative max-h-[90vh] max-w-5xl overflow-hidden rounded-2xl bg-white p-2 shadow-2xl" onClick={(event) => event.stopPropagation()}>
            <button type="button" className="absolute right-3 top-3 rounded-full bg-white/90 px-3 py-1 text-sm font-bold text-zinc-900 shadow" onClick={() => setPreviewImageUrl("")}>
              Đóng
            </button>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={previewImageUrl} alt="Xem trước ảnh sản phẩm" className="max-h-[86vh] w-auto max-w-full rounded-xl object-contain" />
          </div>
        </div>
      ) : null}
    </>
  );
}
