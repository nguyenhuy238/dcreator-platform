"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { PublicHeader } from "@/app/components/dcreator/layout/shell";
import { FormField } from "@/app/components/dcreator/ui/base";
import { CREATOR_PLATFORMS, normalizeCreatorLinks, type CreatorLink } from "@/lib/profile-upgrade-form";

const PLATFORM_LABELS: Record<CreatorLink["platform"], string> = {
  tiktok: "TikTok",
  facebook: "Facebook",
  instagram: "Instagram",
  youtube: "YouTube",
  shopee: "Shopee",
  other: "Khác"
};

type FieldErrors = Record<string, string>;

function ErrorText({ message }: { message?: string }) {
  return message ? <p className="text-xs font-medium text-red-600">{message}</p> : null;
}

function digitsToNumber(value: string) {
  const digits = value.replace(/\D/g, "");
  return digits ? Number.parseInt(digits, 10) : 0;
}

export default function CreatorRegisterPage() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [errors, setErrors] = useState<FieldErrors>({});
  const [form, setForm] = useState({ email: "", password: "", confirmPassword: "", displayName: "", bio: "", contentCategory: "" });
  const [creatorLinks, setCreatorLinks] = useState<CreatorLink[]>([{ platform: "tiktok", url: "", handle: "", followerCount: 0 }]);

  function addLink() {
    setCreatorLinks((items) => [...items, { platform: "tiktok", url: "", handle: "", followerCount: 0 }]);
  }

  function validate() {
    const nextErrors: FieldErrors = {};
    if (!form.email.trim()) nextErrors.email = "Email là bắt buộc.";
    if (form.password.length < 8) nextErrors.password = "Mật khẩu tối thiểu 8 ký tự.";
    if (form.password !== form.confirmPassword) nextErrors.confirmPassword = "Mật khẩu nhập lại không khớp.";
    if (!form.displayName.trim()) nextErrors.displayName = "Tên hiển thị là bắt buộc.";
    try {
      normalizeCreatorLinks(creatorLinks);
    } catch (validationError) {
      nextErrors.creatorLinks = validationError instanceof Error ? validationError.message : "Liên kết không hợp lệ.";
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
      const normalizedLinks = normalizeCreatorLinks(creatorLinks);
      const formData = new FormData(event.currentTarget);
      formData.set("payload", JSON.stringify({
        email: form.email,
        password: form.password,
        displayName: form.displayName,
        bio: form.bio,
        contentCategory: form.contentCategory,
        creatorLinks: normalizedLinks
      }));

      const response = await fetch("/api/auth/register/creator", {
        method: "POST",
        body: formData
      });
      const payload = await response.json();
      if (!response.ok || !payload.success) {
        throw new Error(payload.error ?? "Không thể tạo tài khoản Creator.");
      }

      router.push("/dashboard/creator?created=1");
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
          <p className="text-xs font-bold uppercase tracking-[0.15em] text-zinc-500">Creator Registration</p>
          <h1 className="mt-3 text-4xl font-black tracking-tight text-zinc-900">Đăng ký Creator</h1>
          <p className="mt-3 text-zinc-600">
            Tạo tài khoản và hoàn tất hồ sơ Creator để tham gia campaign, nhận nhiệm vụ và theo dõi hoa hồng.
          </p>
        </section>

        <form className="dc-card mx-auto w-full max-w-none space-y-6 p-7 lg:p-9" onSubmit={onSubmit}>
          <div className="border-b border-zinc-200 pb-4">
            <h2 className="text-2xl font-black text-zinc-900">Đăng ký Creator</h2>
            <p className="mt-1 text-sm text-zinc-600">Tài khoản được tạo kèm hồ sơ Creator và đăng nhập tự động.</p>
          </div>

          <section className="grid gap-4 md:grid-cols-2">
            <h3 className="text-sm font-bold uppercase tracking-[0.12em] text-zinc-500 md:col-span-2">Thông tin tài khoản</h3>
            <FormField label={<span>Email <span className="text-red-500">*</span></span>}>
              <>
                <input type="email" className="dc-input" value={form.email} onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))} placeholder="creator@example.com" disabled={submitting} required />
                <ErrorText message={errors.email} />
              </>
            </FormField>
            <FormField label={<span>Tên hiển thị <span className="text-red-500">*</span></span>}>
              <>
                <input className="dc-input" value={form.displayName} onChange={(event) => setForm((current) => ({ ...current, displayName: event.target.value }))} placeholder="Linh Review" disabled={submitting} required />
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
            <h3 className="text-sm font-bold uppercase tracking-[0.12em] text-zinc-500 md:col-span-2">Hồ sơ Creator</h3>
            <FormField label="Avatar Creator">
              <input name="avatar" type="file" accept="image/png,image/jpeg,image/webp" className="dc-input bg-white" disabled={submitting} />
            </FormField>
            <FormField label="Ngành hàng ưu tiên review">
              <input className="dc-input" value={form.contentCategory} onChange={(event) => setForm((current) => ({ ...current, contentCategory: event.target.value }))} placeholder="Beauty, F&B, Lifestyle..." disabled={submitting} />
            </FormField>
            <div className="md:col-span-2">
              <FormField label="Giới thiệu bản thân / mô tả kênh">
                <textarea className="dc-input min-h-28" value={form.bio} onChange={(event) => setForm((current) => ({ ...current, bio: event.target.value }))} placeholder="Nội dung chính, tệp người xem, kinh nghiệm review..." disabled={submitting} />
              </FormField>
            </div>
          </section>

          <section className="grid gap-3 border-t border-zinc-200 pt-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h3 className="text-sm font-bold uppercase tracking-[0.12em] text-zinc-500">Liên kết mạng xã hội / kênh bán hàng</h3>
              <button type="button" className="dc-btn-secondary" onClick={addLink} disabled={submitting}>Thêm link</button>
            </div>
            {creatorLinks.map((item, index) => (
              <div key={`${index}-${item.platform}`} className="grid gap-2 rounded-2xl border border-zinc-200 bg-zinc-50 p-3 sm:grid-cols-[9rem_minmax(0,1fr)]">
                <select className="dc-input bg-white" value={item.platform} onChange={(event) => setCreatorLinks((items) => items.map((link, itemIndex) => itemIndex === index ? { ...link, platform: event.target.value as CreatorLink["platform"] } : link))} disabled={submitting}>
                  {CREATOR_PLATFORMS.map((platform) => <option key={platform} value={platform}>{PLATFORM_LABELS[platform]}</option>)}
                </select>
                <input className="dc-input bg-white" inputMode="url" placeholder="https://..." value={item.url} onChange={(event) => setCreatorLinks((items) => items.map((link, itemIndex) => itemIndex === index ? { ...link, url: event.target.value } : link))} disabled={submitting} />
                <input className="dc-input bg-white" placeholder="@ten_tai_khoan" value={item.handle} onChange={(event) => setCreatorLinks((items) => items.map((link, itemIndex) => itemIndex === index ? { ...link, handle: event.target.value } : link))} disabled={submitting} />
                <input className="dc-input bg-white" inputMode="numeric" placeholder="Số lượng follower" value={item.followerCount ? item.followerCount.toLocaleString("vi-VN") : ""} onChange={(event) => setCreatorLinks((items) => items.map((link, itemIndex) => itemIndex === index ? { ...link, followerCount: digitsToNumber(event.target.value) } : link))} disabled={submitting} />
                <button type="button" className="dc-btn-secondary text-red-700 sm:col-span-2" onClick={() => setCreatorLinks((items) => items.length > 1 ? items.filter((_, itemIndex) => itemIndex !== index) : [{ platform: "tiktok", url: "", handle: "", followerCount: 0 }])} disabled={submitting}>
                  Xóa
                </button>
              </div>
            ))}
            <ErrorText message={errors.creatorLinks} />
            <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-800">
              CCCD/KYC có thể bổ sung sau trong dashboard khi cần xác minh nâng cao hoặc payout.
            </p>
          </section>

          {error ? <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}
          <button className="dc-btn-primary w-full" disabled={submitting} type="submit">
            {submitting ? "Đang tạo..." : "Tạo tài khoản Creator"}
          </button>
          <p className="text-sm text-zinc-600">
            Đã có tài khoản? <Link href="/auth/login" className="font-semibold text-zinc-900">Đăng nhập</Link>
          </p>
        </form>
      </main>
    </>
  );
}
