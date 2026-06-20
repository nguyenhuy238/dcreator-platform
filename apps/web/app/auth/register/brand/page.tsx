"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { PublicHeader } from "@/app/components/dcreator/layout/shell";
import { FormField } from "@/app/components/dcreator/ui/base";
import { BRAND_LINK_PLATFORMS, normalizeBrandLinks, resolveSelectedIndustries, type BrandLink, type BrandLinkPlatform } from "@/lib/profile-upgrade-form";
import { upsertCurrentBrandInContext } from "@/app/dashboard/brand/_hooks/use-brand-context";

const INDUSTRY_OPTIONS = ["Thời trang", "Mỹ phẩm", "F&B", "Đồ gia dụng", "Công nghệ", "Mẹ và bé", "Sức khỏe", "Giáo dục", "Giải trí", "Khác"] as const;
const BRAND_LINK_LABELS: Record<BrandLinkPlatform, string> = {
  website: "Website chính thức",
  tiktok: "TikTok",
  tiktok_shop: "TikTok Shop",
  shopee: "Shopee",
  facebook: "Facebook",
  instagram: "Instagram",
  youtube: "YouTube",
  lazada: "Lazada",
  other: "Khác"
};

type FieldErrors = Record<string, string>;

function ErrorText({ message }: { message?: string }) {
  return message ? <p className="text-xs font-medium text-red-600">{message}</p> : null;
}

export default function BrandRegisterPage() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [errors, setErrors] = useState<FieldErrors>({});
  const [selectedIndustries, setSelectedIndustries] = useState<string[]>([]);
  const [otherIndustry, setOtherIndustry] = useState("");
  const [brandLinks, setBrandLinks] = useState<BrandLink[]>([{ platform: "website", url: "" }]);
  const [form, setForm] = useState({
    email: "",
    password: "",
    confirmPassword: "",
    displayName: "",
    brandName: "",
    description: "",
    contactName: "",
    contactPhone: "",
    contactEmail: ""
  });

  function addBrandLink() {
    const used = new Set(brandLinks.map((item) => item.platform));
    const nextPlatform = BRAND_LINK_PLATFORMS.find((platform) => platform === "other" || !used.has(platform)) ?? "other";
    setBrandLinks((items) => [...items, { platform: nextPlatform, url: "" }]);
  }

  function validate() {
    const nextErrors: FieldErrors = {};
    if (!form.email.trim()) nextErrors.email = "Email là bắt buộc.";
    if (form.password.length < 8) nextErrors.password = "Mật khẩu tối thiểu 8 ký tự.";
    if (form.password !== form.confirmPassword) nextErrors.confirmPassword = "Mật khẩu nhập lại không khớp.";
    if (!form.displayName.trim()) nextErrors.displayName = "Tên hiển thị là bắt buộc.";
    if (!form.brandName.trim()) nextErrors.brandName = "Tên nhãn hàng là bắt buộc.";
    if (form.contactPhone && !/^(0|\+84)[0-9\s.-]{8,14}$/.test(form.contactPhone)) nextErrors.contactPhone = "Số điện thoại Việt Nam không hợp lệ.";
    try {
      resolveSelectedIndustries(selectedIndustries, otherIndustry);
    } catch (validationError) {
      nextErrors.industry = validationError instanceof Error ? validationError.message : "Vui lòng chọn ngành hàng.";
    }
    try {
      normalizeBrandLinks(brandLinks);
    } catch (validationError) {
      nextErrors.brandLinks = validationError instanceof Error ? validationError.message : "Liên kết không hợp lệ.";
    }
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    if (!validate()) return;
    setSubmitting(true);

    try {
      const industries = resolveSelectedIndustries(selectedIndustries, otherIndustry);
      const normalizedLinks = normalizeBrandLinks(brandLinks);
      const formData = new FormData(event.currentTarget);
      formData.set("payload", JSON.stringify({
        email: form.email,
        password: form.password,
        displayName: form.displayName,
        brandName: form.brandName,
        industry: industries.join(", "),
        description: form.description,
        contactName: form.contactName,
        contactPhone: form.contactPhone,
        contactEmail: form.contactEmail || form.email,
        website: normalizedLinks.find((item) => item.platform === "website")?.url ?? "",
        brandLinks: normalizedLinks,
        legalName: "",
        taxCode: "",
        address: ""
      }));

      const response = await fetch("/api/auth/register/brand", {
        method: "POST",
        body: formData
      });
      const payload = await response.json();
      if (!response.ok || !payload.success) {
        throw new Error(payload.error ?? "Không thể tạo tài khoản Brand.");
      }

      if (payload.data?.brand?.id) {
        upsertCurrentBrandInContext({
          id: payload.data.brand.id,
          name: payload.data.brand.name,
          role: "OWNER"
        });
      }
      router.push("/dashboard/brand?created=1");
      router.refresh();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Lỗi server. Vui lòng thử lại.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <PublicHeader />
      <main className="mx-auto grid min-h-[calc(100vh-80px)] w-full max-w-[88rem] items-start gap-6 px-4 py-8 md:grid-cols-[0.75fr_1.25fr] md:px-6">
        <section className="hidden rounded-3xl border border-zinc-200 bg-white p-8 md:block">
          <p className="text-xs font-bold uppercase tracking-[0.15em] text-zinc-500">Brand Portal</p>
          <h1 className="mt-3 text-4xl font-black tracking-tight text-zinc-900">Đăng ký Brand</h1>
          <p className="mt-3 text-zinc-600">
            Tạo tài khoản Brand Portal để quản lý sản phẩm, campaign và làm việc với Creator.
          </p>
        </section>

        <form className="dc-card mx-auto w-full max-w-none space-y-6 p-7 lg:p-9" onSubmit={onSubmit}>
          <div className="border-b border-zinc-200 pb-4">
            <h2 className="text-2xl font-black text-zinc-900">Đăng ký Brand</h2>
            <p className="mt-1 text-sm text-zinc-600">Tài khoản được tạo kèm quyền Brand Owner và đăng nhập tự động.</p>
          </div>

          <section className="grid gap-4 md:grid-cols-2">
            <h3 className="text-sm font-bold uppercase tracking-[0.12em] text-zinc-500 md:col-span-2">Thông tin tài khoản</h3>
            <FormField label={<span>Email <span className="text-red-500">*</span></span>}>
              <>
                <input type="email" className="dc-input" value={form.email} onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))} placeholder="brand@example.com" disabled={submitting} required />
                <ErrorText message={errors.email} />
              </>
            </FormField>
            <FormField label={<span>Tên hiển thị <span className="text-red-500">*</span></span>}>
              <>
                <input className="dc-input" value={form.displayName} onChange={(event) => setForm((current) => ({ ...current, displayName: event.target.value }))} placeholder="FreshSkin Team" disabled={submitting} required />
                <ErrorText message={errors.displayName} />
              </>
            </FormField>
            <FormField label={<span>Mật khẩu <span className="text-red-500">*</span></span>}>
              <>
                <input type="password" className="dc-input" value={form.password} onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))} placeholder="Tối thiểu 8 ký tự" disabled={submitting} required minLength={8} />
                <ErrorText message={errors.password} />
              </>
            </FormField>
            <FormField label={<span>Nhập lại mật khẩu <span className="text-red-500">*</span></span>}>
              <>
                <input type="password" className="dc-input" value={form.confirmPassword} onChange={(event) => setForm((current) => ({ ...current, confirmPassword: event.target.value }))} placeholder="Nhập lại mật khẩu" disabled={submitting} required minLength={8} />
                <ErrorText message={errors.confirmPassword} />
              </>
            </FormField>
          </section>

          <section className="grid gap-4 border-t border-zinc-200 pt-5 md:grid-cols-2">
            <h3 className="text-sm font-bold uppercase tracking-[0.12em] text-zinc-500 md:col-span-2">Thông tin Brand</h3>
            <FormField label={<span>Tên nhãn hàng <span className="text-red-500">*</span></span>}>
              <>
                <input className="dc-input" value={form.brandName} onChange={(event) => setForm((current) => ({ ...current, brandName: event.target.value }))} placeholder="FreshSkin" disabled={submitting} required />
                <ErrorText message={errors.brandName} />
              </>
            </FormField>
            <FormField label="Logo Brand">
              <input name="logo" type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" className="dc-input bg-white" disabled={submitting} />
            </FormField>
            <div className="md:col-span-2">
              <FormField label={<span>Ngành hàng <span className="text-red-500">*</span></span>}>
                <>
                  <div className="flex flex-wrap gap-2">
                    {INDUSTRY_OPTIONS.map((industry) => {
                      const selected = selectedIndustries.includes(industry);
                      return (
                        <button key={industry} type="button" className={`rounded-full border px-3 py-1.5 text-sm font-medium transition ${selected ? "border-zinc-900 bg-zinc-900 text-white" : "border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-100"}`} onClick={() => setSelectedIndustries((items) => selected ? items.filter((item) => item !== industry) : [...items, industry])} disabled={submitting}>
                          {industry}
                        </button>
                      );
                    })}
                  </div>
                  {selectedIndustries.includes("Khác") ? <input className="dc-input mt-2" placeholder="Nhập ngành hàng khác" value={otherIndustry} onChange={(event) => setOtherIndustry(event.target.value)} disabled={submitting} /> : null}
                  <ErrorText message={errors.industry} />
                </>
              </FormField>
            </div>
            <div className="md:col-span-2">
              <FormField label="Mô tả ngắn">
                <textarea className="dc-input min-h-24" value={form.description} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} placeholder="Sản phẩm, thế mạnh, nhu cầu hợp tác với Creator..." disabled={submitting} />
              </FormField>
            </div>
            <FormField label="Tên người liên hệ">
              <input className="dc-input" value={form.contactName} onChange={(event) => setForm((current) => ({ ...current, contactName: event.target.value }))} placeholder="Nguyễn An" disabled={submitting} />
            </FormField>
            <FormField label="Số điện thoại liên hệ">
              <>
                <input className="dc-input" value={form.contactPhone} onChange={(event) => setForm((current) => ({ ...current, contactPhone: event.target.value }))} placeholder="09xx xxx xxx" disabled={submitting} />
                <ErrorText message={errors.contactPhone} />
              </>
            </FormField>
            <FormField label="Email liên hệ">
              <input className="dc-input" type="email" value={form.contactEmail} onChange={(event) => setForm((current) => ({ ...current, contactEmail: event.target.value }))} placeholder="owner@example.com" disabled={submitting} />
            </FormField>
          </section>

          <section className="grid gap-3 border-t border-zinc-200 pt-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h3 className="text-sm font-bold uppercase tracking-[0.12em] text-zinc-500">Website / kênh bán hàng / mạng xã hội</h3>
              <button type="button" className="dc-btn-secondary" onClick={addBrandLink} disabled={submitting}>Thêm link</button>
            </div>
            {brandLinks.map((item, index) => {
              const selectedPlatforms = new Set(brandLinks.map((link, linkIndex) => linkIndex === index ? "" : link.platform));
              return (
                <div key={`${index}-${item.platform}`} className="grid gap-2 rounded-2xl border border-zinc-200 bg-zinc-50 p-3 sm:grid-cols-[12rem_minmax(0,1fr)_auto]">
                  <select className="dc-input bg-white" value={item.platform} onChange={(event) => setBrandLinks((items) => items.map((link, itemIndex) => itemIndex === index ? { ...link, platform: event.target.value as BrandLinkPlatform } : link))} disabled={submitting}>
                    {BRAND_LINK_PLATFORMS.map((platform) => <option key={platform} value={platform} disabled={platform !== "other" && selectedPlatforms.has(platform)}>{BRAND_LINK_LABELS[platform]}</option>)}
                  </select>
                  <input className="dc-input bg-white" inputMode="url" placeholder="https://..." value={item.url} onChange={(event) => setBrandLinks((items) => items.map((link, itemIndex) => itemIndex === index ? { ...link, url: event.target.value } : link))} disabled={submitting} />
                  <button type="button" className="dc-btn-secondary h-fit text-red-700" onClick={() => setBrandLinks((items) => items.length > 1 ? items.filter((_, itemIndex) => itemIndex !== index) : [{ platform: "website", url: "" }])} disabled={submitting}>
                    Xóa
                  </button>
                </div>
              );
            })}
            <ErrorText message={errors.brandLinks} />
          </section>

          {error ? <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}
          <button className="dc-btn-primary w-full" disabled={submitting} type="submit">
            {submitting ? "Đang tạo..." : "Tạo tài khoản Brand"}
          </button>
          <p className="text-sm text-zinc-600">
            Đã có tài khoản? <Link href="/auth/login" className="font-semibold text-zinc-900">Đăng nhập</Link>
          </p>
        </form>
      </main>
    </>
  );
}
