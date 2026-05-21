"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { PublicHeader } from "@/app/components/dcreator/layout/shell";
import { FormField } from "@/app/components/dcreator/ui/base";

type UploadResponse = {
  idCardFrontImageUrl: string;
  idCardBackImageUrl: string;
  portraitImageUrl: string;
};

export default function CreatorRegisterPage() {
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [idCardFrontImageUrl, setIdCardFrontImageUrl] = useState("");
  const [idCardBackImageUrl, setIdCardBackImageUrl] = useState("");
  const [portraitImageUrl, setPortraitImageUrl] = useState("");

  async function uploadKycImages(formData: FormData) {
    const uploadData = new FormData();
    const idCardFrontImage = formData.get("idCardFrontImage");
    const idCardBackImage = formData.get("idCardBackImage");
    const portraitImage = formData.get("portraitImage");

    if (idCardFrontImage instanceof File) uploadData.append("idCardFrontImage", idCardFrontImage);
    if (idCardBackImage instanceof File) uploadData.append("idCardBackImage", idCardBackImage);
    if (portraitImage instanceof File) uploadData.append("portraitImage", portraitImage);

    const response = await fetch("/api/uploads/creator-kyc", {
      method: "POST",
      body: uploadData
    });
    const payload = await response.json();
    if (!response.ok || !payload.success) {
      throw new Error(payload.error ?? "Không thể tải ảnh KYC.");
    }
    return payload.data as UploadResponse;
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
    const confirmPassword = String(formData.get("confirmPassword") ?? "").trim();
    const tiktokUrl = String(formData.get("tiktokUrl") ?? "").trim();
    const instagramUrl = String(formData.get("instagramUrl") ?? "").trim();
    const facebookUrl = String(formData.get("facebookUrl") ?? "").trim();
    const followerCount = String(formData.get("followerCount") ?? "").trim();
    const preferredCategory = String(formData.get("preferredCategory") ?? "").trim();
    const creatorNote = String(formData.get("creatorNote") ?? "").trim();
    const kycConfirmed = formData.get("kycConfirmed") === "on";

    if (password !== confirmPassword) {
      setLoading(false);
      setError("Mật khẩu nhập lại không khớp.");
      return;
    }

    if (!kycConfirmed) {
      setLoading(false);
      setError("Bạn cần xác nhận KYC trước khi gửi.");
      return;
    }

    if (
      !(formData.get("idCardFrontImage") instanceof File) ||
      !(formData.get("idCardBackImage") instanceof File) ||
      !(formData.get("portraitImage") instanceof File)
    ) {
      setLoading(false);
      setError("Vui lòng tải lên ảnh CCCD mặt trước, mặt sau và ảnh chân dung.");
      return;
    }

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
      const uploaded = await uploadKycImages(formData);
      setIdCardFrontImageUrl(uploaded.idCardFrontImageUrl);
      setIdCardBackImageUrl(uploaded.idCardBackImageUrl);
      setPortraitImageUrl(uploaded.portraitImageUrl);

      const note = [
        `Tên hiển thị: ${displayName}`,
        `Email: ${email}`,
        `TikTok: ${tiktokUrl || "Chưa cung cấp"}`,
        `Instagram: ${instagramUrl || "Chưa cung cấp"}`,
        `Facebook: ${facebookUrl || "Chưa cung cấp"}`,
        `Số follower: ${followerCount}`,
        `Ngành hàng ưu tiên review: ${preferredCategory}`,
        `KYC CCCD mặt trước: ${uploaded.idCardFrontImageUrl}`,
        `KYC CCCD mặt sau: ${uploaded.idCardBackImageUrl}`,
        `KYC chân dung: ${uploaded.portraitImageUrl}`,
        `Ghi chú thêm: ${creatorNote || "Không có"}`
      ].join("\n");

      const roleRequestResponse = await fetch("/api/role-requests/creator", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ note })
      });
      const roleRequestPayload = await roleRequestResponse.json();
      if (!roleRequestResponse.ok || !roleRequestPayload.success) {
        throw new Error(roleRequestPayload.error ?? "Không thể gửi yêu cầu Creator.");
      }

      setSuccess("Đã tạo tài khoản Creator. Hồ sơ đang chờ duyệt.");
      event.currentTarget.reset();
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
          <p className="text-xs font-bold uppercase tracking-[0.15em] text-zinc-500">Creator Registration</p>
          <h1 className="mt-3 text-4xl font-black tracking-tight">Đăng ký Creator</h1>
          <p className="mt-3 text-zinc-600">
            Tạo tài khoản bằng email và mật khẩu, sau đó gửi hồ sơ để được duyệt Creator.
          </p>
        </section>

        <form className="dc-card mx-auto w-full max-w-none space-y-6 p-7 lg:p-9" onSubmit={onSubmit}>
          <div className="border-b border-zinc-200 pb-4">
            <h2 className="text-2xl font-black">Đăng ký Creator</h2>
            <p className="mt-1 text-sm text-zinc-600">Điền thông tin theo từng cụm để dễ nhìn hơn.</p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <FormField label={<span>Email <span className="text-red-500">*</span></span>}>
              <input name="email" type="email" className="dc-input" placeholder="example@email.com" required />
            </FormField>
            <FormField label={<span>Mật khẩu <span className="text-red-500">*</span></span>}>
              <input name="password" type="password" className="dc-input" placeholder="Tối thiểu 8 ký tự" required minLength={8} />
            </FormField>
            <FormField label={<span>Nhập lại mật khẩu <span className="text-red-500">*</span></span>}>
              <input name="confirmPassword" type="password" className="dc-input" placeholder="Nhập lại mật khẩu" required minLength={8} />
            </FormField>
            <FormField label={<span>Tên hiển thị <span className="text-red-500">*</span></span>}>
              <input name="displayName" className="dc-input" placeholder="Ví dụ: Linh Review" required minLength={2} />
            </FormField>
            <FormField label={<span>Số follower <span className="text-red-500">*</span></span>}>
              <input name="followerCount" type="number" className="dc-input" placeholder="Ví dụ: 25000" required min={1} />
            </FormField>
            <FormField
              label={
                <span className="flex items-center gap-2">
                  Ảnh CCCD mặt trước <span className="text-red-500">*</span>
                </span>
              }
            >
              <label className="flex cursor-pointer items-center justify-between gap-3 rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-600">
                <span>Chọn ảnh mặt trước</span>
                <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-zinc-900 text-white">
                  <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4 fill-none stroke-current stroke-[2.25]">
                    <path d="M12 16V5" />
                    <path d="m7.5 9.5 4.5-4.5 4.5 4.5" />
                    <path d="M5 19h14" />
                  </svg>
                </span>
                <input name="idCardFrontImage" type="file" accept="image/*" className="hidden" required />
              </label>
            </FormField>
            <FormField
              label={
                <span className="flex items-center gap-2">
                  Ảnh CCCD mặt sau <span className="text-red-500">*</span>
                </span>
              }
            >
              <label className="flex cursor-pointer items-center justify-between gap-3 rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-600">
                <span>Chọn ảnh mặt sau</span>
                <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-zinc-900 text-white">
                  <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4 fill-none stroke-current stroke-[2.25]">
                    <path d="M12 16V5" />
                    <path d="m7.5 9.5 4.5-4.5 4.5 4.5" />
                    <path d="M5 19h14" />
                  </svg>
                </span>
                <input name="idCardBackImage" type="file" accept="image/*" className="hidden" required />
              </label>
            </FormField>
            <FormField
              label={
                <span className="flex items-center gap-2">
                  Ảnh chân dung <span className="text-red-500">*</span>
                </span>
              }
            >
              <label className="flex cursor-pointer items-center justify-between gap-3 rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-600">
                <span>Chọn ảnh chân dung</span>
                <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-zinc-900 text-white">
                  <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4 fill-none stroke-current stroke-[2.25]">
                    <path d="M12 16V5" />
                    <path d="m7.5 9.5 4.5-4.5 4.5 4.5" />
                    <path d="M5 19h14" />
                  </svg>
                </span>
                <input name="portraitImage" type="file" accept="image/*" className="hidden" required />
              </label>
            </FormField>
            {idCardFrontImageUrl ? <p className="text-xs text-zinc-500 md:col-span-2">CCCD mặt trước: {idCardFrontImageUrl}</p> : null}
            {idCardBackImageUrl ? <p className="text-xs text-zinc-500 md:col-span-2">CCCD mặt sau: {idCardBackImageUrl}</p> : null}
            {portraitImageUrl ? <p className="text-xs text-zinc-500 md:col-span-2">Chân dung: {portraitImageUrl}</p> : null}

            <div className="grid gap-4 md:col-span-2 md:grid-cols-2">
              <FormField label={<span>TikTok <span className="text-red-500">*</span></span>}>
                <input name="tiktokUrl" type="url" className="dc-input" placeholder="https://www.tiktok.com/@yourhandle" required />
              </FormField>
              <FormField label={<span>Instagram <span className="text-red-500">*</span></span>}>
                <input name="instagramUrl" type="url" className="dc-input" placeholder="https://www.instagram.com/yourhandle" required />
              </FormField>
              <FormField label={<span>Facebook <span className="text-red-500">*</span></span>}>
                <input name="facebookUrl" type="url" className="dc-input" placeholder="https://www.facebook.com/yourpage" required />
              </FormField>
              <FormField label={<span>Ngành hàng ưu tiên review <span className="text-red-500">*</span></span>}>
                <input name="preferredCategory" className="dc-input" placeholder="Ví dụ: Beauty, Lifestyle, Mẹ & bé..." required />
              </FormField>
            </div>

            <div className="md:col-span-2">
              <FormField label="Mô tả kênh của bạn">
                <textarea
                  name="creatorNote"
                  className="dc-input min-h-32"
                  placeholder="Ví dụ: TikTok 30k follower, nội dung beauty/lifestyle, tần suất 4 video/tuần..."
                />
              </FormField>
            </div>

            <label className="flex items-start gap-2 text-sm text-zinc-700 md:col-span-2">
              <input name="kycConfirmed" type="checkbox" className="mt-1" required />
              <span>Tôi cam kết thông tin trên là đúng và đồng ý KYC khi được yêu cầu.</span>
            </label>
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
