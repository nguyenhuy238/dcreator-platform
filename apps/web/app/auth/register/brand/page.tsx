"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { PublicHeader } from "@/app/components/dcreator/layout/shell";
import { FormField } from "@/app/components/dcreator/ui/base";

type UploadState = {
  idCardFrontImageUrl: string;
  idCardBackImageUrl: string;
  businessLicenseUrl: string | null;
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
    const businessLicenseFile = formData.get("businessLicenseFile");

    if (!(representativeIdFrontImage instanceof File) || representativeIdFrontImage.size === 0) {
      throw new Error("Vui lòng tải lên CCCD người đại diện mặt trước.");
    }
    if (!(representativeIdBackImage instanceof File) || representativeIdBackImage.size === 0) {
      throw new Error("Vui lòng tải lên CCCD người đại diện mặt sau.");
    }

    uploadData.append("representativeIdFrontImage", representativeIdFrontImage);
    uploadData.append("representativeIdBackImage", representativeIdBackImage);
    if (businessLicenseFile instanceof File && businessLicenseFile.size > 0) {
      uploadData.append("businessLicense", businessLicenseFile);
    }

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
    const legalName = String(formData.get("legalName") ?? "").trim();
    const industry = String(formData.get("industry") ?? "").trim();
    const productCategories = String(formData.get("productCategories") ?? "").trim();
    const inventoryDescription = String(formData.get("inventoryDescription") ?? "").trim();
    const website = String(formData.get("website") ?? "").trim();
    const fanpage = String(formData.get("fanpage") ?? "").trim();
    const address = String(formData.get("address") ?? "").trim();
    const logoUrl = String(formData.get("logoUrl") ?? "").trim();
    const representativeName = String(formData.get("representativeName") ?? "").trim();
    const representativeEmail = String(formData.get("representativeEmail") ?? "").trim();
    const representativeIdentityNumber = String(formData.get("representativeIdentityNumber") ?? "").trim();
    const phone = String(formData.get("phone") ?? "").trim();
    const taxCode = String(formData.get("taxCode") ?? "").trim();
    const campaignGoal = String(formData.get("campaignGoal") ?? "").trim();
    const estimatedBudget = String(formData.get("estimatedBudget") ?? "").trim();
    const expectedCreatorCount = String(formData.get("expectedCreatorCount") ?? "").trim();
    const brandNote = String(formData.get("brandNote") ?? "").trim();

    try {
      const registerResponse = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ displayName, email, password })
      });
      const registerPayload = await registerResponse.json();
      if (!registerResponse.ok || !registerPayload.success) {
        throw new Error(registerPayload.error ?? "Không thể tạo tài khoản.");
      }

      setUploading(true);
      const uploadState = await uploadBrandKycFiles(formData);
      setIdCardFrontImageUrl(uploadState.idCardFrontImageUrl);
      setIdCardBackImageUrl(uploadState.idCardBackImageUrl);

      const applicationResponse = await fetch("/api/profile/brand-application", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          brandName,
          logoUrl,
          legalName,
          industry,
          website,
          fanpage,
          address,
          contactName: representativeName,
          contactPhone: phone,
          contactEmail: representativeEmail || email,
          description: brandNote,
          businessGoal: campaignGoal,
          taxCode,
          businessLicenseUrl: uploadState.businessLicenseUrl ?? undefined,
          representativeName,
          representativePhone: phone,
          representativeEmail: representativeEmail || email,
          representativeIdentityNumber,
          productCategories,
          inventoryDescription: [
            inventoryDescription,
            `CCCD mặt trước: ${uploadState.idCardFrontImageUrl}`,
            `CCCD mặt sau: ${uploadState.idCardBackImageUrl}`
          ].filter(Boolean).join("\n"),
          expectedCampaignBudget: estimatedBudget ? Number(estimatedBudget) : undefined,
          expectedCreatorCount: expectedCreatorCount ? Number(expectedCreatorCount) : undefined
        })
      });
      const applicationPayload = await applicationResponse.json();
      if (!applicationResponse.ok || !applicationPayload.success) {
        throw new Error(applicationPayload.error ?? "Không thể gửi đăng ký Brand.");
      }

      setSuccess("Đã gửi đăng ký Brand. Sau khi duyệt, Brand Dashboard sẽ mở bước hoàn tất BCC/onboarding.");
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
      <main className="mx-auto grid min-h-[calc(100vh-80px)] w-full max-w-[88rem] items-start gap-6 px-4 py-8 md:grid-cols-[0.75fr_1.25fr] md:px-6">
        <section className="hidden rounded-3xl border border-zinc-200 bg-white p-8 md:block">
          <p className="text-xs font-bold uppercase tracking-[0.15em] text-zinc-500">Brand Onboarding</p>
          <h1 className="mt-3 text-4xl font-black tracking-tight">Đăng ký Brand</h1>
          <p className="mt-3 text-zinc-600">
            Hoàn tất thông tin pháp lý, ngành hàng, danh mục sản phẩm và xác nhận BCC để dCreator duyệt Brand Portal.
          </p>
          <div className="mt-6 grid gap-3 text-sm text-zinc-600">
            <p>1. Tạo tài khoản Brand Portal.</p>
            <p>2. Gửi hồ sơ pháp lý và danh mục sản phẩm.</p>
            <p>3. Xác nhận BCC về doanh thu, hoa hồng và trách nhiệm pháp lý.</p>
          </div>
        </section>

        <form className="dc-card mx-auto w-full max-w-none space-y-6 p-7 lg:p-9" onSubmit={onSubmit}>
          <div className="border-b border-zinc-200 pb-4">
            <h2 className="text-2xl font-black">Thông tin Brand Portal</h2>
            <p className="mt-1 text-sm text-zinc-600">Trường có <span className="text-red-500">*</span> là bắt buộc.</p>
          </div>

          <section className="grid gap-4 md:grid-cols-2">
            <FormField label={<span>Email <span className="text-red-500">*</span></span>}>
              <input name="email" type="email" className="dc-input" placeholder="brand@example.com" required />
            </FormField>
            <FormField label={<span>Mật khẩu <span className="text-red-500">*</span></span>}>
              <input name="password" type="password" className="dc-input" placeholder="Tối thiểu 8 ký tự" required minLength={8} />
            </FormField>
            <FormField label={<span>Tên hiển thị <span className="text-red-500">*</span></span>}>
              <input name="displayName" className="dc-input" placeholder="FreshSkin Team" required minLength={2} />
            </FormField>
            <FormField label={<span>Tên thương hiệu <span className="text-red-500">*</span></span>}>
              <input name="brandName" className="dc-input" placeholder="FreshSkin" required minLength={2} />
            </FormField>
            <FormField label={<span>Pháp nhân / tên công ty <span className="text-red-500">*</span></span>}>
              <input name="legalName" className="dc-input" placeholder="Công ty TNHH FreshSkin" required />
            </FormField>
            <FormField label={<span>Mã số thuế <span className="text-red-500">*</span></span>}>
              <input name="taxCode" className="dc-input" placeholder="0101234567" required />
            </FormField>
            <FormField label={<span>Ngành hàng <span className="text-red-500">*</span></span>}>
              <input name="industry" className="dc-input" placeholder="Beauty, Food, Fashion..." required />
            </FormField>
            <FormField label={<span>Danh mục sản phẩm <span className="text-red-500">*</span></span>}>
              <input name="productCategories" className="dc-input" placeholder="Skincare, voucher spa, combo quà..." required />
            </FormField>
            <FormField label={<span>Website <span className="text-red-500">*</span></span>}>
              <input name="website" type="url" className="dc-input" placeholder="https://example.com" required />
            </FormField>
            <FormField label={<span>Fanpage</span>}>
              <input name="fanpage" type="url" className="dc-input" placeholder="https://facebook.com/..." />
            </FormField>
            <FormField label={<span>Logo thương hiệu <span className="text-red-500">*</span></span>}>
              <input name="logoUrl" type="url" className="dc-input" placeholder="https://example.com/logo.png" required />
            </FormField>
            <FormField label={<span>Giấy phép kinh doanh <span className="text-xs text-zinc-500">(PDF, DOC, DOCX, JPG, PNG – tối đa 10MB)</span></span>}>
              <input name="businessLicenseFile" type="file" accept=".pdf,.doc,.docx,.jpg,.jpeg,.png" className="dc-input bg-white" />
            </FormField>
            <div className="md:col-span-2">
              <FormField label={<span>Địa chỉ kinh doanh</span>}>
                <input name="address" className="dc-input" placeholder="Số nhà, phường/xã, quận/huyện, tỉnh/thành" />
              </FormField>
            </div>
            <div className="md:col-span-2">
              <FormField label={<span>Mô tả tồn kho / sản phẩm có thể dùng làm campaign capital</span>}>
                <textarea name="inventoryDescription" className="dc-input min-h-24" placeholder="Sản phẩm, voucher, số lượng, điều kiện đổi quà..." />
              </FormField>
            </div>
          </section>

          <section className="grid gap-4 border-t border-zinc-200 pt-5 md:grid-cols-2">
            <FormField label={<span>Người đại diện <span className="text-red-500">*</span></span>}>
              <input name="representativeName" className="dc-input" placeholder="Nguyễn An" required />
            </FormField>
            <FormField label={<span>Số điện thoại <span className="text-red-500">*</span></span>}>
              <input name="phone" className="dc-input" placeholder="09xx xxx xxx" required />
            </FormField>
            <FormField label={<span>Email người đại diện</span>}>
              <input name="representativeEmail" type="email" className="dc-input" placeholder="owner@example.com" />
            </FormField>
            <FormField label={<span>Số CCCD / định danh người đại diện</span>}>
              <input name="representativeIdentityNumber" className="dc-input" placeholder="012345678901" />
            </FormField>
            <div className="grid gap-4 rounded-2xl border border-zinc-200 bg-zinc-50 p-4 md:col-span-2 md:grid-cols-2">
              <FormField label={<span>CCCD mặt trước <span className="text-red-500">*</span></span>}>
                <input name="representativeIdFrontImage" type="file" accept="image/*" className="dc-input bg-white" required />
              </FormField>
              <FormField label={<span>CCCD mặt sau <span className="text-red-500">*</span></span>}>
                <input name="representativeIdBackImage" type="file" accept="image/*" className="dc-input bg-white" required />
              </FormField>
              {idCardFrontImageUrl ? <p className="text-xs text-zinc-500 md:col-span-2">CCCD mặt trước: {idCardFrontImageUrl}</p> : null}
              {idCardBackImageUrl ? <p className="text-xs text-zinc-500 md:col-span-2">CCCD mặt sau: {idCardBackImageUrl}</p> : null}
            </div>
          </section>

          <section className="grid gap-4 border-t border-zinc-200 pt-5 md:grid-cols-2">
            <FormField label={<span>Mục tiêu campaign</span>}>
              <input name="campaignGoal" className="dc-input" placeholder="Tăng nhận diện, tăng đơn hàng, xử lý tồn kho..." />
            </FormField>
            <FormField label={<span>Ngân sách dự kiến (VND)</span>}>
              <input name="estimatedBudget" type="number" min={0} className="dc-input" placeholder="50000000" />
            </FormField>
            <FormField label={<span>Số creator dự kiến</span>}>
              <input name="expectedCreatorCount" type="number" min={0} className="dc-input" placeholder="20" />
            </FormField>
            <div className="md:col-span-2">
              <FormField label={<span>Ghi chú</span>}>
                <textarea name="brandNote" className="dc-input min-h-24" placeholder="Thông tin thêm về nhu cầu hợp tác..." />
              </FormField>
            </div>
          </section>

          {success ? <p className="rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{success}</p> : null}
          {error ? <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}

          <button className="dc-btn-primary w-full" disabled={loading || uploading}>
            {loading || uploading ? "Đang gửi..." : "Gửi đăng ký Brand"}
          </button>

          <p className="text-sm text-zinc-600">
            Đã có tài khoản?{" "}
            <Link href="/auth/login" className="font-semibold text-zinc-900">Đăng nhập</Link>
          </p>
        </form>
      </main>
    </>
  );
}
