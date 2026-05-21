"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { PublicHeader } from "@/app/components/dcreator/layout/shell";
import { FormField } from "@/app/components/dcreator/ui/base";

type UploadState = {
  idCardFrontImageUrl: string;
  idCardBackImageUrl: string;
};

export default function BrandRegisterPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [idCardFrontImageUrl, setIdCardFrontImageUrl] = useState("");
  const [idCardBackImageUrl, setIdCardBackImageUrl] = useState("");

  async function uploadBrandKycFiles(formData: FormData): Promise<UploadState> {
    const uploadData = new FormData();
    const representativeIdFrontImage = formData.get("representativeIdFrontImage");
    const representativeIdBackImage = formData.get("representativeIdBackImage");

    if (!(representativeIdFrontImage instanceof File) || representativeIdFrontImage.size === 0) {
      throw new Error("Vui lòng tải lên CCCD người đại diện (mặt trước).");
    }
    if (!(representativeIdBackImage instanceof File) || representativeIdBackImage.size === 0) {
      throw new Error("Vui lòng tải lên CCCD người đại diện (mặt sau).");
    }

    uploadData.append("representativeIdFrontImage", representativeIdFrontImage);
    uploadData.append("representativeIdBackImage", representativeIdBackImage);

    const uploadResponse = await fetch("/api/uploads/brand-kyc", {
      method: "POST",
      body: uploadData
    });
    const uploadPayload = await uploadResponse.json();

    if (!uploadResponse.ok || !uploadPayload.success) {
      throw new Error(uploadPayload.error ?? "Không thể tải ảnh xác minh Brand.");
    }

    return uploadPayload.data as UploadState;
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");

    const formData = new FormData(event.currentTarget);
    const displayName = String(formData.get("displayName") ?? "").trim();
    const email = String(formData.get("email") ?? "").trim();
    const password = String(formData.get("password") ?? "").trim();
    const brandName = String(formData.get("brandName") ?? "").trim();
    const brandCategory = String(formData.get("brandCategory") ?? "").trim();
    const region = String(formData.get("region") ?? "").trim();
    const website = String(formData.get("website") ?? "").trim();
    const representativeName = String(formData.get("representativeName") ?? "").trim();
    const phone = String(formData.get("phone") ?? "").trim();
    const taxCode = String(formData.get("taxCode") ?? "").trim();
    const logoUrl = String(formData.get("logoUrl") ?? "").trim();
    const campaignGoal = String(formData.get("campaignGoal") ?? "").trim();
    const estimatedBudget = String(formData.get("estimatedBudget") ?? "").trim();
    const brandNote = String(formData.get("brandNote") ?? "").trim();

    try {
      setUploading(true);
      const uploadState = await uploadBrandKycFiles(formData);
      setIdCardFrontImageUrl(uploadState.idCardFrontImageUrl);
      setIdCardBackImageUrl(uploadState.idCardBackImageUrl);

      const registerResponse = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ displayName, email, password })
      });
      const registerPayload = await registerResponse.json();
      if (!registerResponse.ok || !registerPayload.success) {
        throw new Error(registerPayload.error ?? "Không thể tạo tài khoản.");
      }

      const noteLines = [
        `Ngành hàng: ${brandCategory}`,
        `Khu vực: ${region}`,
        `Người đại diện: ${representativeName}`,
        `Số điện thoại: ${phone}`,
        `Mã số thuế: ${taxCode}`,
        `Logo: ${logoUrl}`,
        `CCCD người đại diện (mặt trước): ${uploadState.idCardFrontImageUrl}`,
        `CCCD người đại diện (mặt sau): ${uploadState.idCardBackImageUrl}`
      ];

      if (campaignGoal) noteLines.push(`Mục tiêu campaign: ${campaignGoal}`);
      if (estimatedBudget) noteLines.push(`Ngân sách dự kiến: ${estimatedBudget}`);
      if (brandNote) noteLines.push(`Ghi chú: ${brandNote}`);

      const requestResponse = await fetch("/api/role-requests/brand", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          brandName,
          brandWebsite: website,
          note: noteLines.join("\n")
        })
      });
      const requestPayload = await requestResponse.json();
      if (!requestResponse.ok || !requestPayload.success) {
        throw new Error(requestPayload.error ?? "Không thể gửi đăng ký Brand.");
      }

      setSuccess("Đã gửi đăng ký Brand. Hồ sơ đang chờ duyệt.");
      event.currentTarget.reset();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Có lỗi xảy ra. Vui lòng thử lại.");
    } finally {
      setUploading(false);
      setLoading(false);
    }
  }

  return (
    <>
      <PublicHeader />
      <main className="mx-auto grid min-h-[calc(100vh-80px)] w-full max-w-[88rem] items-center gap-6 px-4 py-8 md:grid-cols-[0.8fr_1.2fr] md:px-6">
        <section className="hidden rounded-3xl border border-zinc-200 bg-white p-8 md:block">
          <p className="text-xs font-bold uppercase tracking-[0.15em] text-zinc-500">Brand Registration</p>
          <h1 className="mt-3 text-4xl font-black tracking-tight">Đăng ký Brand</h1>
          <p className="mt-3 text-zinc-600">Điền thông tin thương hiệu để tạo hồ sơ và chờ duyệt sử dụng hệ thống.</p>
        </section>

        <form className="dc-card mx-auto w-full max-w-none space-y-6 p-7 lg:p-9" onSubmit={onSubmit}>
          <div className="border-b border-zinc-200 pb-4">
            <h2 className="text-2xl font-black">Đăng ký Brand</h2>
            <p className="mt-1 text-sm text-zinc-600">
              Trường có <span className="text-red-500">*</span> là bắt buộc.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <FormField label={<span>Email <span className="text-red-500">*</span></span>}>
              <input name="email" type="email" className="dc-input" placeholder="example@email.com" required />
            </FormField>
            <FormField label={<span>Mật khẩu <span className="text-red-500">*</span></span>}>
              <input name="password" type="password" className="dc-input" placeholder="Tối thiểu 8 ký tự" required minLength={8} />
            </FormField>
            <FormField label={<span>Tên hiển thị <span className="text-red-500">*</span></span>}>
              <input name="displayName" className="dc-input" placeholder="Ví dụ: FreshSkin Team" required minLength={2} />
            </FormField>
            <FormField label={<span>Tên thương hiệu <span className="text-red-500">*</span></span>}>
              <input name="brandName" className="dc-input" placeholder="Ví dụ: FreshSkin" required minLength={2} />
            </FormField>
            <FormField label={<span>Ngành hàng <span className="text-red-500">*</span></span>}>
              <input name="brandCategory" className="dc-input" placeholder="Ví dụ: Beauty, Food, Fashion..." required />
            </FormField>
            <FormField label={<span>Khu vực <span className="text-red-500">*</span></span>}>
              <input name="region" className="dc-input" placeholder="Ví dụ: Hà Nội, TP.HCM, Toàn quốc..." required />
            </FormField>
            <FormField label={<span>Website <span className="text-red-500">*</span></span>}>
              <input name="website" type="url" className="dc-input" placeholder="https://example.com" required />
            </FormField>
            <FormField label={<span>Logo thương hiệu <span className="text-red-500">*</span></span>}>
              <input name="logoUrl" type="url" className="dc-input" placeholder="https://example.com/logo.png" required />
            </FormField>
            <FormField label={<span>Người đại diện <span className="text-red-500">*</span></span>}>
              <input name="representativeName" className="dc-input" placeholder="Ví dụ: Nguyễn An" required />
            </FormField>
            <div className="grid gap-4 rounded-2xl border border-zinc-200 bg-zinc-50 p-4 md:col-span-2 md:grid-cols-2">
              <FormField
                label={
                  <span className="flex items-center gap-2">
                    CCCD người đại diện (mặt trước) <span className="text-red-500">*</span>
                  </span>
                }
              >
                <label className="flex cursor-pointer items-center justify-between gap-3 rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-600">
                  <span>Chọn ảnh mặt trước</span>
                  <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-zinc-900 text-white">
                    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4 fill-none stroke-current stroke-[2.25]">
                      <path d="M12 16V5" />
                      <path d="m7.5 9.5 4.5-4.5 4.5 4.5" />
                      <path d="M5 19h14" />
                    </svg>
                  </span>
                  <input name="representativeIdFrontImage" type="file" accept="image/*" className="hidden" required />
                </label>
              </FormField>
              <FormField
                label={
                  <span className="flex items-center gap-2">
                    CCCD người đại diện (mặt sau) <span className="text-red-500">*</span>
                  </span>
                }
              >
                <label className="flex cursor-pointer items-center justify-between gap-3 rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-600">
                  <span>Chọn ảnh mặt sau</span>
                  <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-zinc-900 text-white">
                    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4 fill-none stroke-current stroke-[2.25]">
                      <path d="M12 16V5" />
                      <path d="m7.5 9.5 4.5-4.5 4.5 4.5" />
                      <path d="M5 19h14" />
                    </svg>
                  </span>
                  <input name="representativeIdBackImage" type="file" accept="image/*" className="hidden" required />
                </label>
              </FormField>
              {idCardFrontImageUrl ? <p className="text-xs text-zinc-500 md:col-span-2">CCCD mặt trước: {idCardFrontImageUrl}</p> : null}
              {idCardBackImageUrl ? <p className="text-xs text-zinc-500 md:col-span-2">CCCD mặt sau: {idCardBackImageUrl}</p> : null}
            </div>
            <FormField label={<span>Số điện thoại <span className="text-red-500">*</span></span>}>
              <input name="phone" className="dc-input" placeholder="Ví dụ: 09xx xxx xxx" required />
            </FormField>
            <FormField label={<span>Mã số thuế <span className="text-red-500">*</span></span>}>
              <input name="taxCode" className="dc-input" placeholder="Ví dụ: 0101234567" required />
            </FormField>
            <FormField label={<span>Mục tiêu campaign</span>}>
              <input name="campaignGoal" className="dc-input" placeholder="Ví dụ: tăng nhận diện, tăng đơn hàng..." />
            </FormField>
            <FormField label={<span>Ngân sách dự kiến</span>}>
              <input name="estimatedBudget" className="dc-input" placeholder="Ví dụ: 50.000.000đ" />
            </FormField>
            <div className="md:col-span-2">
              <FormField label={<span>Ghi chú</span>}>
                <textarea
                  name="brandNote"
                  className="dc-input min-h-28"
                  placeholder="Mô tả ngắn về thương hiệu và nhu cầu phối hợp..."
                />
              </FormField>
            </div>
          </div>

          {success ? <p className="rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{success}</p> : null}
          {error ? <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}

          <button className="dc-btn-primary w-full" disabled={loading || uploading}>
            {loading || uploading ? "Đang gửi..." : "Gửi đăng ký"}
          </button>

          <p className="text-sm text-zinc-600">
            Đã có tài khoản?{" "}
            <Link href="/auth/login" className="font-semibold text-zinc-900">
              Đăng nhập
            </Link>
          </p>
        </form>
      </main>
    </>
  );
}
