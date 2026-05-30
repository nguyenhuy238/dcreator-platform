"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { AppShell } from "@/app/components/dcreator/layout/shell";
import type { Role } from "@prisma/client";
import { getNavItemsForWorkspace } from "@/lib/navigation";

const nav = getNavItemsForWorkspace("user", ["USER", "CREATOR", "BRAND_OWNER", "BRAND_STAFF", "ADMIN", "OPS"]);

type Snapshot = {
  account: {
    id: string;
    email: string;
    displayName: string;
    avatarUrl: string | null;
    role: string;
    roles: Role[];
    brandMemberships?: Array<{ id: string; name: string; role: string }>;
    hasCreatorProfile?: boolean;
    profile: { phone: string | null } | null;
  };
  creatorApplication: null | Record<string, unknown>;
  brandApplication: null | Record<string, unknown>;
};

const defaultCreator = {
  displayName: "",
  bio: ""
};

const defaultBrand = {
  brandName: "",
  industry: "",
  description: "",
  contactName: "",
  contactPhone: "",
  contactEmail: "",
  website: ""
};

const BRAND_BCC_VERSION = "BCC-dCreator-v1";

function statusText(value?: unknown) {
  if (value === "PENDING_REVIEW") return "Hồ sơ đã được tạo";
  if (value === "APPROVED") return "Hồ sơ đã được tạo";
  if (value === "REJECTED") return "Đã từ chối";
  if (value === "NEEDS_REVISION") return "Cần bổ sung";
  return "Chưa gửi";
}

function resolveAvatarSrc(input?: string | null) {
  const raw = (input ?? "").trim();
  if (!raw) return "";

  try {
    const parsed = new URL(raw);
    if (parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1") {
      return `${parsed.pathname}${parsed.search}`;
    }
    return raw;
  } catch {
    if (raw.startsWith("/")) return raw;
    return "";
  }
}

export default function UserProfilePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [data, setData] = useState<Snapshot | null>(null);
  const [creatorForm, setCreatorForm] = useState(defaultCreator);
  const [brandForm, setBrandForm] = useState(defaultBrand);
  const [submittingCreator, setSubmittingCreator] = useState(false);
  const [submittingBrand, setSubmittingBrand] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [avatarLoadError, setAvatarLoadError] = useState(false);

  async function load() {
    setLoading(true);
    setError("");
    const res = await fetch("/api/profile/role-upgrade", { cache: "no-store" });
    const payload = await res.json();
    if (!res.ok || !payload.success) {
      setError(payload.error ?? "Không thể tải profile");
      setLoading(false);
      return;
    }
    setData(payload.data as Snapshot);
    setLoading(false);
  }

  useEffect(() => {
    let active = true;
    const denied = searchParams.get("denied");
    if (denied) setError(denied);
    fetch("/api/auth/me", { cache: "no-store" })
      .then(async (response) => {
        const payload = await response.json();
        if (!active) return;
        if (!response.ok || !payload?.success) {
          void load();
          return;
        }
        void load();
      })
      .catch(() => {
        if (active) void load();
      });
    return () => {
      active = false;
    };
  }, [searchParams]);

  const sidebarItems = useMemo(() => {
    return nav;
  }, []);
  const avatarSrc = useMemo(() => resolveAvatarSrc(data?.account.avatarUrl), [data?.account.avatarUrl]);

  useEffect(() => {
    setAvatarLoadError(false);
  }, [avatarSrc]);

  async function submitCreator(event: FormEvent) {
    event.preventDefault();
    if (!data) return;
    setSubmittingCreator(true);
    setError("");
    setSuccess("");

    const body = {
      displayName: creatorForm.displayName || data.account.displayName,
      bio: creatorForm.bio
    };
    const response = await fetch("/api/creator/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
    const payload = await response.json();
    setSubmittingCreator(false);
    if (!response.ok || !payload.success) {
      setError(payload.error ?? "Gửi đơn Creator thất bại");
      return;
    }
    setSuccess("Creator Profile đã được tạo. Hãy thêm kênh social đầu tiên của bạn.");
    router.push("/dashboard/creator?created=1");
    router.refresh();
  }

  async function submitBrand(event: FormEvent) {
    event.preventDefault();
    if (!data) return;
    setSubmittingBrand(true);
    setError("");
    setSuccess("");

    const body = {
      brandName: brandForm.brandName,
      industry: brandForm.industry,
      description: brandForm.description
    };
    const response = await fetch("/api/brand/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
    const payload = await response.json();
    setSubmittingBrand(false);
    if (!response.ok || !payload.success) {
      setError(payload.error ?? "Tạo Brand thất bại");
      return;
    }
    setSuccess("Brand đã được tạo. Bạn có thể bắt đầu thiết lập sản phẩm/campaign.");
    router.push("/dashboard/brand?created=1");
    router.refresh();
  }

  if (loading) {
    return <><AppShell sidebarItems={sidebarItems}><div className="dc-card p-6">Đang tải hồ sơ...</div></AppShell></>;
  }

  async function uploadAvatar(file: File) {
    setUploadingAvatar(true);
    setError("");
    setSuccess("");
    try {
      const formData = new FormData();
      formData.append("avatar", file);
      const uploadRes = await fetch("/api/uploads/avatar", { method: "POST", body: formData });
      const uploadPayload = await uploadRes.json();
      if (!uploadRes.ok || !uploadPayload.success || !uploadPayload.data?.avatarUrl) {
        throw new Error(uploadPayload.error ?? "Không thể tải ảnh đại diện");
      }

      const patchRes = await fetch("/api/profile/account", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ avatarUrl: uploadPayload.data.avatarUrl })
      });
      const patchPayload = await patchRes.json();
      if (!patchRes.ok || !patchPayload.success) {
        throw new Error(patchPayload.error ?? "Không thể cập nhật ảnh đại diện");
      }

      setData((current) => {
        if (!current) return current;
        return {
          ...current,
          account: {
            ...current.account,
            avatarUrl: patchPayload.data.avatarUrl
          }
        };
      });
      setAvatarLoadError(false);
      setSuccess("Đã cập nhật ảnh đại diện.");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Không thể tải ảnh đại diện");
    } finally {
      setUploadingAvatar(false);
    }
  }

  if (!data) {
    return <><AppShell sidebarItems={sidebarItems}><div className="dc-card p-6 text-red-700">{error || "Không tìm thấy hồ sơ"}</div></AppShell></>;
  }

  const creatorStatus = data.creatorApplication?.status as string | undefined;
  const brandStatus = data.brandApplication?.status as string | undefined;
  const isCreator = Boolean(data.account.hasCreatorProfile) || data.account.roles.includes("CREATOR");
  const hasBrand = (data.account.brandMemberships?.length ?? 0) > 0;

  return (
    <>
      <AppShell sidebarItems={sidebarItems}>
        <h1 className="text-3xl font-black">Hồ sơ cá nhân</h1>
        <p className="mt-2 text-sm text-zinc-600">Đăng ký nâng cấp Creator/Brand tại đây và bắt đầu thiết lập dashboard ngay sau khi tạo hồ sơ.</p>
        {error ? <p className="mt-4 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}
        {success ? <p className="mt-4 rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{success}</p> : null}

        <section id="role-requests" className="mt-6 grid gap-4 md:grid-cols-2">
          <div className="dc-card p-5">
            <h2 className="text-xl font-bold">Thông tin cá nhân</h2>
            <div className="mt-3 flex items-center gap-3">
              {avatarSrc && !avatarLoadError ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={avatarSrc}
                  alt={data.account.displayName || "User avatar"}
                  className="h-12 w-12 rounded-xl border border-zinc-200 object-cover"
                  onError={() => setAvatarLoadError(true)}
                />
              ) : (
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-zinc-900 text-sm font-bold text-white">
                  {data.account.displayName.slice(0, 1).toUpperCase() || "U"}
                </div>
              )}
              <label className="dc-btn-secondary cursor-pointer">
                {uploadingAvatar ? "Đang tải..." : "Tải ảnh đại diện"}
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  className="hidden"
                  disabled={uploadingAvatar}
                  onChange={(event) => {
                    const file = event.target.files?.[0] ?? null;
                    if (file) void uploadAvatar(file);
                    event.target.value = "";
                  }}
                />
              </label>
            </div>
            <p className="mt-2 text-sm">Tên hiển thị: <span className="font-semibold">{data.account.displayName}</span></p>
            <p className="text-sm">Email: <span className="font-semibold">{data.account.email}</span></p>
            <p className="text-sm">Số điện thoại: <span className="font-semibold">{data.account.profile?.phone ?? "Chưa có"}</span></p>
          </div>
          <div className="dc-card p-5">
            <h2 className="text-xl font-bold">Vai trò & xác minh</h2>
            <p className="mt-2 text-sm">Vai trò chính: <span className="font-semibold">{data.account.role}</span></p>
            <p className="text-sm">Tất cả vai trò: <span className="font-semibold">{data.account.roles.join(", ")}</span></p>
          </div>
        </section>

        <section className="mt-6 grid gap-4 md:grid-cols-2">
          <div className="dc-card p-5">
            <h2 className="text-xl font-bold">Nâng cấp Creator</h2>
            <p className="mt-2 text-sm">Trạng thái: <span className="font-semibold">{isCreator ? "Creator Profile đã được tạo" : statusText(creatorStatus)}</span></p>
            {isCreator || creatorStatus === "APPROVED" || creatorStatus === "PENDING_REVIEW" ? (
              <p className="mt-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-700">
                Xác minh danh tính giúp mở khóa payout.
              </p>
            ) : null}
            {data.creatorApplication?.rejectReason ? <p className="mt-2 text-sm text-red-700">Lý do: {String(data.creatorApplication.rejectReason)}</p> : null}
            {isCreator || creatorStatus === "APPROVED" || creatorStatus === "PENDING_REVIEW" ? <Link className="dc-btn-primary mt-4 inline-flex" href="/dashboard/creator">Vào Bảng điều khiển Nhà sáng tạo</Link> : null}
            {!isCreator && creatorStatus !== "APPROVED" && creatorStatus !== "PENDING_REVIEW" ? (
              <form className="mt-4 grid gap-3" onSubmit={submitCreator}>
                <input className="dc-input" placeholder="Tên hiển thị" value={creatorForm.displayName} onChange={(e) => setCreatorForm((x) => ({ ...x, displayName: e.target.value }))} required />
                <textarea className="dc-input min-h-24" placeholder="Giới thiệu bản thân" value={creatorForm.bio} onChange={(e) => setCreatorForm((x) => ({ ...x, bio: e.target.value }))} />
                <p className="text-xs font-medium text-zinc-500">Sau khi tạo profile, hãy thêm kênh social đầu tiên trong Creator Dashboard.</p>
                <button className="dc-btn-primary" disabled={submittingCreator} type="submit">{submittingCreator ? "Đang tạo..." : "Trở thành Creator"}</button>
              </form>
            ) : null}
          </div>

          <div className="dc-card p-5">
            <h2 className="text-xl font-bold">Nâng cấp Brand</h2>
            <p className="mt-2 text-sm">Trạng thái: <span className="font-semibold">{hasBrand ? "Brand đã được tạo" : statusText(brandStatus)}</span></p>
            {data.brandApplication?.rejectReason ? <p className="mt-2 text-sm text-red-700">Lý do: {String(data.brandApplication.rejectReason)}</p> : null}
            {hasBrand ? <Link className="dc-btn-primary mt-4 inline-flex" href="/dashboard/brand">Vào Bảng điều khiển Nhãn hàng</Link> : null}
            {!hasBrand ? (
              <form className="mt-4 grid gap-3" onSubmit={submitBrand}>
                <input className="dc-input" placeholder="Tên nhãn hàng" value={brandForm.brandName} onChange={(e) => setBrandForm((x) => ({ ...x, brandName: e.target.value }))} required />
                <input className="dc-input" placeholder="Ngành hàng" value={brandForm.industry} onChange={(e) => setBrandForm((x) => ({ ...x, industry: e.target.value }))} required />
                <textarea className="dc-input min-h-20" placeholder="Mô tả ngắn" value={brandForm.description} onChange={(e) => setBrandForm((x) => ({ ...x, description: e.target.value }))} />
                <input className="dc-input" placeholder="Tên người liên hệ" value={brandForm.contactName} onChange={(e) => setBrandForm((x) => ({ ...x, contactName: e.target.value }))} required />
                <input className="dc-input" placeholder="Số điện thoại liên hệ" value={brandForm.contactPhone} onChange={(e) => setBrandForm((x) => ({ ...x, contactPhone: e.target.value }))} required />
                <input className="dc-input" placeholder="Email liên hệ" type="email" value={brandForm.contactEmail} onChange={(e) => setBrandForm((x) => ({ ...x, contactEmail: e.target.value }))} required />
                <input className="dc-input" placeholder="Website" type="url" value={brandForm.website} onChange={(e) => setBrandForm((x) => ({ ...x, website: e.target.value }))} />
                <p className="rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs text-zinc-600">Brand được tạo và dùng ngay. Các thông tin BCC {BRAND_BCC_VERSION}, pháp lý, thanh toán và kho hàng có thể bổ sung sau.</p>
                <button className="dc-btn-primary" disabled={submittingBrand} type="submit">{submittingBrand ? "Đang tạo..." : "Tạo Brand mới"}</button>
              </form>
            ) : null}
          </div>
        </section>
      </AppShell>
    </>
  );
}
