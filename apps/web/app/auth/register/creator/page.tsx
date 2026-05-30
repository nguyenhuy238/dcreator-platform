"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { PublicHeader } from "@/app/components/dcreator/layout/shell";
import { FormField } from "@/app/components/dcreator/ui/base";

type UploadResponse = {
  idCardFrontImageUrl: string;
  idCardBackImageUrl: string;
  portraitImageUrl: string;
};

export default function CreatorRegisterPage() {
  const router = useRouter();
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

  function hasKycFiles(formData: FormData) {
    const files = ["idCardFrontImage", "idCardBackImage", "portraitImage"].map((name) => formData.get(name));
    return files.every((file) => file instanceof File && file.size > 0);
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

    if (password !== confirmPassword) {
      setLoading(false);
      setError("Mật khẩu nhập lại không khớp.");
      return;
    }

    const shouldUploadKyc = hasKycFiles(formData);

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

      setUploading(shouldUploadKyc);
      const uploaded = shouldUploadKyc
        ? await uploadKycImages(formData)
        : { idCardFrontImageUrl: "", idCardBackImageUrl: "", portraitImageUrl: "" };
      if (shouldUploadKyc) {
        setIdCardFrontImageUrl(uploaded.idCardFrontImageUrl);
        setIdCardBackImageUrl(uploaded.idCardBackImageUrl);
        setPortraitImageUrl(uploaded.portraitImageUrl);
      }

      const creatorBio = [
        `TikTok: ${tiktokUrl || "N/A"}`,
        `Instagram: ${instagramUrl || "N/A"}`,
        `Facebook: ${facebookUrl || "N/A"}`,
        `Ghi chú: ${creatorNote || "Không có"}`
      ].join(" | ");

      const creatorApplicationResponse = await fetch("/api/profile/creator-application", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          displayName,
          avatarUrl: "",
          bio: creatorBio,
          mainPlatform: "TIKTOK",
          socialUrl: tiktokUrl,
          handle: "",
          followerCount: Number(followerCount),
          contentCategory: preferredCategory,
          portfolioUrl: instagramUrl,
          location: "",
          expectedRate: 0,
          maxJobsPerMonth: 0,
          realName: "",
          phone: "",
          identityNumber: "",
          identityFrontUrl: uploaded.idCardFrontImageUrl,
          identityBackUrl: uploaded.idCardBackImageUrl,
          selfieUrl: uploaded.portraitImageUrl,
          bankAccountName: "",
          bankAccountNumber: "",
          bankName: "",
          taxCode: ""
        })
      });
      const creatorApplicationPayload = await creatorApplicationResponse.json();
      if (!creatorApplicationResponse.ok || !creatorApplicationPayload.success) {
        throw new Error(creatorApplicationPayload.error ?? "Không thể gửi hồ sơ Creator.");
      }

      setSuccess("Hồ sơ Creator đã được tạo. Bạn có thể bắt đầu thiết lập dashboard ngay.");
      event.currentTarget.reset();
      router.push("/dashboard/creator?created=1");
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
          <p className="text-xs font-bold uppercase tracking-[0.15em] text-zinc-500">Creator Registration</p>
          <h1 className="mt-3 text-4xl font-black tracking-tight">Đăng ký Creator</h1>
          <p className="mt-3 text-zinc-600">
            Tạo tài khoản bằng email và mật khẩu, sau đó hoàn tất hồ sơ để sử dụng Creator Dashboard ngay.
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
              <>
                <input name="followerCount" type="text" inputMode="numeric" pattern="[0-9]*" className="dc-input" placeholder="Ví dụ: 25000" required />
                <p className="text-xs font-medium text-zinc-500">Đơn vị: follower, chỉ nhập số.</p>
              </>
            </FormField>
            <FormField
              label={
                <span className="flex items-center gap-2">
                  Ảnh CCCD mặt trước <span className="text-xs text-zinc-500">(bổ sung sau nếu cần payout)</span>
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
                <input name="idCardFrontImage" type="file" accept="image/*" className="hidden" />
              </label>
            </FormField>
            <FormField
              label={
                <span className="flex items-center gap-2">
                  Ảnh CCCD mặt sau <span className="text-xs text-zinc-500">(tùy chọn)</span>
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
                <input name="idCardBackImage" type="file" accept="image/*" className="hidden" />
              </label>
            </FormField>
            <FormField
              label={
                <span className="flex items-center gap-2">
                  Ảnh chân dung <span className="text-xs text-zinc-500">(tùy chọn)</span>
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
                <input name="portraitImage" type="file" accept="image/*" className="hidden" />
              </label>
            </FormField>
            {idCardFrontImageUrl ? <p className="text-xs text-zinc-500 md:col-span-2">CCCD mặt trước: {idCardFrontImageUrl}</p> : null}
            {idCardBackImageUrl ? <p className="text-xs text-zinc-500 md:col-span-2">CCCD mặt sau: {idCardBackImageUrl}</p> : null}
            {portraitImageUrl ? <p className="text-xs text-zinc-500 md:col-span-2">Chân dung: {portraitImageUrl}</p> : null}

            <div className="grid gap-4 md:col-span-2 md:grid-cols-2">
              <FormField label={<span>TikTok <span className="text-red-500">*</span></span>}>
                <>
                  <input name="tiktokUrl" type="url" className="dc-input" placeholder="https://www.tiktok.com/@yourhandle" required />
                  <p className="text-xs font-medium text-zinc-500">Nhập URL đầy đủ, bao gồm `https://`.</p>
                </>
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
              <input name="kycConfirmed" type="checkbox" className="mt-1" />
              <span>Tôi cam kết thông tin trên là đúng. Xác minh danh tính giúp mở khóa payout.</span>
            </label>
          </div>

          {success ? <p className="rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{success}</p> : null}
          {error ? <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}

          <button className="dc-btn-primary w-full" disabled={loading || uploading}>
            {loading || uploading ? "Đang tạo..." : "Tạo Creator Profile"}
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
