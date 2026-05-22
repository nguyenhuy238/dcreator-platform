"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { AppShell, PublicHeader } from "@/app/components/dcreator/layout/shell";
import type { Role } from "@prisma/client";

const nav = [
  { href: "/dashboard/user", label: "Tổng quan" },
  { href: "/dashboard/user/profile", label: "User profile" },
  { href: "/campaigns", label: "Campaign" },
  { href: "/wallet", label: "Wallet" },
  { href: "/vouchers", label: "Voucher" }
];

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
    const denied = searchParams.get("denied");
    if (denied) setError(denied);
    void load();
  }, [searchParams]);

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
      setError(payload.error ?? "Gửi Creator application thất bại");
      return;
    }
    setSuccess("Đã gửi hồ sơ Creator, trạng thái: PENDING_REVIEW.");
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
      setError(payload.error ?? "Gửi Brand application thất bại");
      return;
    }
    setSuccess("Đã gửi hồ sơ Brand, trạng thái: PENDING_REVIEW.");
    await load();
  }

  if (loading) {
    return <><PublicHeader /><AppShell sidebarItems={nav}><div className="dc-card p-6">Loading profile...</div></AppShell></>;
  }

  if (!data) {
    return <><PublicHeader /><AppShell sidebarItems={nav}><div className="dc-card p-6 text-red-700">{error || "Profile not found"}</div></AppShell></>;
  }

  const creatorStatus = data.creatorApplication?.status as string | undefined;
  const brandStatus = data.brandApplication?.status as string | undefined;

  return (
    <>
      <PublicHeader />
      <AppShell sidebarItems={nav}>
        <h1 className="text-3xl font-black">User Profile</h1>
        <p className="mt-2 text-sm text-zinc-600">Đăng ký nâng cấp Creator/Brand tại đây và theo dõi trạng thái duyệt.</p>
        {error ? <p className="mt-4 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}
        {success ? <p className="mt-4 rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{success}</p> : null}

        <section className="mt-6 grid gap-4 md:grid-cols-2">
          <div className="dc-card p-5">
            <h2 className="text-xl font-bold">Personal Information</h2>
            <p className="mt-2 text-sm">Display name: <span className="font-semibold">{data.account.displayName}</span></p>
            <p className="text-sm">Email: <span className="font-semibold">{data.account.email}</span></p>
            <p className="text-sm">Phone: <span className="font-semibold">{data.account.profile?.phone ?? "N/A"}</span></p>
          </div>
          <div className="dc-card p-5">
            <h2 className="text-xl font-bold">Role & Verification</h2>
            <p className="mt-2 text-sm">Primary role: <span className="font-semibold">{data.account.role}</span></p>
            <p className="text-sm">All roles: <span className="font-semibold">{data.account.roles.join(", ")}</span></p>
          </div>
        </section>

        <section className="mt-6 grid gap-4 md:grid-cols-2">
          <div className="dc-card p-5">
            <h2 className="text-xl font-bold">Creator Upgrade</h2>
            <p className="mt-2 text-sm">Trạng thái: <span className="font-semibold">{statusText(creatorStatus)}</span></p>
            {data.creatorApplication?.rejectReason ? <p className="mt-2 text-sm text-red-700">Lý do: {String(data.creatorApplication.rejectReason)}</p> : null}
            {creatorStatus === "APPROVED" ? <Link className="dc-btn-primary mt-4 inline-flex" href="/dashboard/creator">Vào Creator Dashboard</Link> : null}
            {creatorStatus !== "APPROVED" && creatorStatus !== "PENDING_REVIEW" ? (
              <form className="mt-4 grid gap-3" onSubmit={submitCreator}>
                <input className="dc-input" placeholder="Display name" value={creatorForm.displayName} onChange={(e) => setCreatorForm((x) => ({ ...x, displayName: e.target.value }))} required />
                <select className="dc-input" value={creatorForm.mainPlatform} onChange={(e) => setCreatorForm((x) => ({ ...x, mainPlatform: e.target.value }))}>
                  <option value="TIKTOK">TIKTOK</option>
                  <option value="INSTAGRAM">INSTAGRAM</option>
                  <option value="YOUTUBE">YOUTUBE</option>
                  <option value="FACEBOOK">FACEBOOK</option>
                  <option value="OTHER">OTHER</option>
                </select>
                <input className="dc-input" placeholder="Social URL" type="url" value={creatorForm.socialUrl} onChange={(e) => setCreatorForm((x) => ({ ...x, socialUrl: e.target.value }))} required />
                <input className="dc-input" placeholder="Follower count" type="number" min={0} value={creatorForm.followerCount} onChange={(e) => setCreatorForm((x) => ({ ...x, followerCount: e.target.value }))} />
                <textarea className="dc-input min-h-24" placeholder="Bio" value={creatorForm.bio} onChange={(e) => setCreatorForm((x) => ({ ...x, bio: e.target.value }))} />
                <button className="dc-btn-primary" disabled={submittingCreator} type="submit">{submittingCreator ? "Đang gửi..." : creatorStatus ? "Gửi lại hồ sơ Creator" : "Đăng ký Creator"}</button>
              </form>
            ) : null}
          </div>

          <div className="dc-card p-5">
            <h2 className="text-xl font-bold">Brand Upgrade</h2>
            <p className="mt-2 text-sm">Trạng thái: <span className="font-semibold">{statusText(brandStatus)}</span></p>
            {data.brandApplication?.rejectReason ? <p className="mt-2 text-sm text-red-700">Lý do: {String(data.brandApplication.rejectReason)}</p> : null}
            {brandStatus === "APPROVED" ? <Link className="dc-btn-primary mt-4 inline-flex" href="/dashboard/brand">Vào Brand Dashboard</Link> : null}
            {brandStatus !== "APPROVED" && brandStatus !== "PENDING_REVIEW" ? (
              <form className="mt-4 grid gap-3" onSubmit={submitBrand}>
                <input className="dc-input" placeholder="Brand name" value={brandForm.brandName} onChange={(e) => setBrandForm((x) => ({ ...x, brandName: e.target.value }))} required />
                <input className="dc-input" placeholder="Contact name" value={brandForm.contactName} onChange={(e) => setBrandForm((x) => ({ ...x, contactName: e.target.value }))} required />
                <input className="dc-input" placeholder="Contact phone" value={brandForm.contactPhone} onChange={(e) => setBrandForm((x) => ({ ...x, contactPhone: e.target.value }))} required />
                <input className="dc-input" placeholder="Contact email" type="email" value={brandForm.contactEmail} onChange={(e) => setBrandForm((x) => ({ ...x, contactEmail: e.target.value }))} required />
                <input className="dc-input" placeholder="Website" type="url" value={brandForm.website} onChange={(e) => setBrandForm((x) => ({ ...x, website: e.target.value }))} />
                <button className="dc-btn-primary" disabled={submittingBrand} type="submit">{submittingBrand ? "Đang gửi..." : brandStatus ? "Gửi lại hồ sơ Brand" : "Đăng ký Brand"}</button>
              </form>
            ) : null}
          </div>
        </section>
      </AppShell>
    </>
  );
}
