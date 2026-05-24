"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
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
    profile: { phone: string | null } | null;
  };
  creatorApplication: null | Record<string, unknown>;
  brandApplication: null | Record<string, unknown>;
};

const defaultCreator = {
  displayName: "",
  mainPlatform: "TIKTOK",
  socialUrl: "",
  bio: "",
  followerCount: ""
};

const defaultBrand = {
  brandName: "",
  contactName: "",
  contactPhone: "",
  contactEmail: "",
  website: ""
};

const BRAND_BCC_VERSION = "BCC-dCreator-v1";

function statusText(value?: unknown) {
  if (value === "PENDING_REVIEW") return "Đang chờ duyệt";
  if (value === "APPROVED") return "Đã duyệt";
  if (value === "REJECTED") return "Đã từ chối";
  if (value === "NEEDS_REVISION") return "Cần bổ sung";
  return "Chưa gửi";
}

export default function UserProfilePage() {
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [data, setData] = useState<Snapshot | null>(null);
  const [creatorForm, setCreatorForm] = useState(defaultCreator);
  const [brandForm, setBrandForm] = useState(defaultBrand);
  const [submittingCreator, setSubmittingCreator] = useState(false);
  const [submittingBrand, setSubmittingBrand] = useState(false);

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

  async function submitCreator(event: FormEvent) {
    event.preventDefault();
    if (!data) return;
    setSubmittingCreator(true);
    setError("");
    setSuccess("");

    const currentStatus = data.creatorApplication?.status as string | undefined;
    const isResubmit = currentStatus === "REJECTED" || currentStatus === "NEEDS_REVISION";
    const endpoint = "/api/profile/creator-application";
    const body = {
      ...creatorForm,
      followerCount: creatorForm.followerCount ? Number(creatorForm.followerCount) : undefined,
      applicationId: isResubmit ? data.creatorApplication?.id : undefined
    };
    const response = await fetch(endpoint, {
      method: isResubmit ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
    const payload = await response.json();
    setSubmittingCreator(false);
    if (!response.ok || !payload.success) {
      setError(payload.error ?? "Gửi đơn Creator thất bại");
      return;
    }
    setSuccess("Đã gửi hồ sơ Creator, trạng thái: Chờ duyệt.");
    await load();
  }

  async function submitBrand(event: FormEvent) {
    event.preventDefault();
    if (!data) return;
    setSubmittingBrand(true);
    setError("");
    setSuccess("");

    const currentStatus = data.brandApplication?.status as string | undefined;
    const isResubmit = currentStatus === "REJECTED" || currentStatus === "NEEDS_REVISION";
    const endpoint = "/api/profile/brand-application";
    const body = {
      ...brandForm,
      legalName: brandForm.brandName,
      revenueSharePercent: 70,
      commissionRatePercent: 10,
      bccAgreementAccepted: true,
      bccAgreementVersion: BRAND_BCC_VERSION,
      legalResponsibilityAccepted: true,
      applicationId: isResubmit ? data.brandApplication?.id : undefined
    };
    const response = await fetch(endpoint, {
      method: isResubmit ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
    const payload = await response.json();
    setSubmittingBrand(false);
    if (!response.ok || !payload.success) {
      setError(payload.error ?? "Gửi đơn Brand thất bại");
      return;
    }
    setSuccess("Đã gửi hồ sơ Brand, trạng thái: Chờ duyệt.");
    await load();
  }

  if (loading) {
    return <><AppShell sidebarItems={sidebarItems}><div className="dc-card p-6">Đang tải hồ sơ...</div></AppShell></>;
  }

  if (!data) {
    return <><AppShell sidebarItems={sidebarItems}><div className="dc-card p-6 text-red-700">{error || "Không tìm thấy hồ sơ"}</div></AppShell></>;
  }

  const creatorStatus = data.creatorApplication?.status as string | undefined;
  const brandStatus = data.brandApplication?.status as string | undefined;

  return (
    <>
      <AppShell sidebarItems={sidebarItems}>
        <h1 className="text-3xl font-black">Hồ sơ cá nhân</h1>
        <p className="mt-2 text-sm text-zinc-600">Đăng ký nâng cấp Creator/Brand tại đây và theo dõi trạng thái duyệt.</p>
        {error ? <p className="mt-4 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}
        {success ? <p className="mt-4 rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{success}</p> : null}

        <section id="role-requests" className="mt-6 grid gap-4 md:grid-cols-2">
          <div className="dc-card p-5">
            <h2 className="text-xl font-bold">Thông tin cá nhân</h2>
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
            <p className="mt-2 text-sm">Trạng thái: <span className="font-semibold">{statusText(creatorStatus)}</span></p>
            {data.creatorApplication?.rejectReason ? <p className="mt-2 text-sm text-red-700">Lý do: {String(data.creatorApplication.rejectReason)}</p> : null}
            {creatorStatus === "APPROVED" ? <Link className="dc-btn-primary mt-4 inline-flex" href="/dashboard/creator">Vào Bảng điều khiển Nhà sáng tạo</Link> : null}
            {creatorStatus !== "APPROVED" && creatorStatus !== "PENDING_REVIEW" ? (
              <form className="mt-4 grid gap-3" onSubmit={submitCreator}>
                <input className="dc-input" placeholder="Tên hiển thị" value={creatorForm.displayName} onChange={(e) => setCreatorForm((x) => ({ ...x, displayName: e.target.value }))} required />
                <select className="dc-input" value={creatorForm.mainPlatform} onChange={(e) => setCreatorForm((x) => ({ ...x, mainPlatform: e.target.value }))}>
                  <option value="TIKTOK">TIKTOK</option>
                  <option value="INSTAGRAM">INSTAGRAM</option>
                  <option value="YOUTUBE">YOUTUBE</option>
                  <option value="FACEBOOK">FACEBOOK</option>
                  <option value="OTHER">OTHER</option>
                </select>
                <input className="dc-input" placeholder="Liên kết mạng xã hội" type="url" value={creatorForm.socialUrl} onChange={(e) => setCreatorForm((x) => ({ ...x, socialUrl: e.target.value }))} required />
                <input className="dc-input" placeholder="Số lượng người theo dõi" type="number" min={0} value={creatorForm.followerCount} onChange={(e) => setCreatorForm((x) => ({ ...x, followerCount: e.target.value }))} />
                <textarea className="dc-input min-h-24" placeholder="Giới thiệu bản thân" value={creatorForm.bio} onChange={(e) => setCreatorForm((x) => ({ ...x, bio: e.target.value }))} />
                <button className="dc-btn-primary" disabled={submittingCreator} type="submit">{submittingCreator ? "Đang gửi..." : creatorStatus ? "Gửi lại hồ sơ Creator" : "Đăng ký Creator"}</button>
              </form>
            ) : null}
          </div>

          <div className="dc-card p-5">
            <h2 className="text-xl font-bold">Nâng cấp Brand</h2>
            <p className="mt-2 text-sm">Trạng thái: <span className="font-semibold">{statusText(brandStatus)}</span></p>
            {data.brandApplication?.rejectReason ? <p className="mt-2 text-sm text-red-700">Lý do: {String(data.brandApplication.rejectReason)}</p> : null}
            {brandStatus === "APPROVED" ? <Link className="dc-btn-primary mt-4 inline-flex" href="/dashboard/brand">Vào Bảng điều khiển Nhãn hàng</Link> : null}
            {brandStatus !== "APPROVED" && brandStatus !== "PENDING_REVIEW" ? (
              <form className="mt-4 grid gap-3" onSubmit={submitBrand}>
                <input className="dc-input" placeholder="Tên nhãn hàng" value={brandForm.brandName} onChange={(e) => setBrandForm((x) => ({ ...x, brandName: e.target.value }))} required />
                <input className="dc-input" placeholder="Tên người liên hệ" value={brandForm.contactName} onChange={(e) => setBrandForm((x) => ({ ...x, contactName: e.target.value }))} required />
                <input className="dc-input" placeholder="Số điện thoại liên hệ" value={brandForm.contactPhone} onChange={(e) => setBrandForm((x) => ({ ...x, contactPhone: e.target.value }))} required />
                <input className="dc-input" placeholder="Email liên hệ" type="email" value={brandForm.contactEmail} onChange={(e) => setBrandForm((x) => ({ ...x, contactEmail: e.target.value }))} required />
                <input className="dc-input" placeholder="Website" type="url" value={brandForm.website} onChange={(e) => setBrandForm((x) => ({ ...x, website: e.target.value }))} />
                <p className="rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs text-zinc-600">Khi gửi hồ sơ Brand, bạn xác nhận BCC {BRAND_BCC_VERSION}: Brand chịu trách nhiệm pháp lý về sản phẩm/tồn kho/voucher, chia doanh thu Brand 70% và commission nền tảng 10%.</p>
                <button className="dc-btn-primary" disabled={submittingBrand} type="submit">{submittingBrand ? "Đang gửi..." : brandStatus ? "Gửi lại hồ sơ Brand" : "Đăng ký Brand"}</button>
              </form>
            ) : null}
          </div>
        </section>
      </AppShell>
    </>
  );
}
