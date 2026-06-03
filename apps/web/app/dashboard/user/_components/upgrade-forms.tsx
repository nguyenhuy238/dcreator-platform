"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Role } from "@prisma/client";
import { CREATOR_PLATFORMS, normalizeCreatorLinks, resolveSelectedIndustries, type CreatorLink } from "@/lib/profile-upgrade-form";

export type UpgradeSnapshot = {
  account: {
    displayName: string;
    roles: Role[];
    brandMemberships?: Array<{ id: string; name: string; role: string }>;
    hasCreatorProfile?: boolean;
  };
  creatorApplication: null | Record<string, unknown>;
  brandApplication: null | Record<string, unknown>;
};

const INDUSTRY_OPTIONS = ["Thời trang", "Mỹ phẩm", "F&B", "Đồ gia dụng", "Công nghệ", "Mẹ và bé", "Sức khỏe", "Giáo dục", "Giải trí", "Khác"] as const;
const CREATOR_PLATFORM_LABELS: Record<CreatorLink["platform"], string> = {
  tiktok: "TikTok",
  facebook: "Facebook",
  instagram: "Instagram",
  shopee: "Shopee"
};

function onlyDigits(raw: string) {
  return raw.replace(/\D/g, "");
}

function parseFollowerCount(raw: string) {
  const digits = onlyDigits(raw);
  if (!digits) return 0;
  return Number.parseInt(digits, 10);
}

function formatFollowerCount(value: number) {
  if (!Number.isFinite(value) || value <= 0) return "";
  return value.toLocaleString("vi-VN");
}

function statusText(value?: unknown) {
  if (value === "PENDING_REVIEW" || value === "APPROVED") return "Hồ sơ đã được tạo";
  if (value === "REJECTED") return "Đã từ chối";
  if (value === "NEEDS_REVISION") return "Cần bổ sung";
  return "Chưa gửi";
}

export function CreatorUpgradeForm({ data, onError, onSuccess }: { data: UpgradeSnapshot; onError: (message: string) => void; onSuccess: (message: string) => void }) {
  const router = useRouter();
  const [form, setForm] = useState({ displayName: "", bio: "" });
  const [creatorLinks, setCreatorLinks] = useState<CreatorLink[]>([{ platform: "tiktok", url: "", handle: "", followerCount: 0 }]);
  const [submitting, setSubmitting] = useState(false);
  const creatorStatus = data.creatorApplication?.status as string | undefined;
  const isCreator = Boolean(data.account.hasCreatorProfile) || data.account.roles.includes("CREATOR");

  async function submit(event: FormEvent) {
    event.preventDefault();
    onError("");
    onSuccess("");
    let normalizedLinks: CreatorLink[];
    try {
      normalizedLinks = normalizeCreatorLinks(creatorLinks);
    } catch (validationError) {
      onError(validationError instanceof Error ? validationError.message : "Liên kết không hợp lệ.");
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch("/api/creator/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          displayName: form.displayName || data.account.displayName,
          bio: form.bio,
          creatorLinks: normalizedLinks
        })
      });
      const payload = await response.json();
      if (!response.ok || !payload.success) throw new Error(payload.error ?? "Gửi đơn Creator thất bại");
      onSuccess("Creator Profile đã được tạo cùng các liên kết mạng xã hội.");
      router.push("/dashboard/creator?created=1");
      router.refresh();
    } catch (requestError) {
      onError(requestError instanceof Error ? requestError.message : "Gửi đơn Creator thất bại");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <article className="dc-card p-5">
      <h2 className="text-xl font-bold">Nâng cấp Creator</h2>
      <p className="mt-2 text-sm">Trạng thái: <span className="font-semibold">{isCreator ? "Creator Profile đã được tạo" : statusText(creatorStatus)}</span></p>
      {isCreator || creatorStatus === "APPROVED" || creatorStatus === "PENDING_REVIEW" ? (
        <div className="mt-4 grid gap-2">
          <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-700">Xác minh danh tính giúp mở khóa payout.</p>
          <Link className="dc-btn-primary inline-flex w-fit" href="/dashboard/creator">Vào Bảng điều khiển Nhà sáng tạo</Link>
        </div>
      ) : (
        <form className="mt-4 grid gap-3" onSubmit={submit}>
          <input className="dc-input" placeholder="Tên hiển thị" value={form.displayName} onChange={(event) => setForm((current) => ({ ...current, displayName: event.target.value }))} required />
          <textarea className="dc-input min-h-24" placeholder="Giới thiệu bản thân" value={form.bio} onChange={(event) => setForm((current) => ({ ...current, bio: event.target.value }))} />
          <div className="grid gap-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-semibold text-zinc-700">Liên kết mạng xã hội / kênh bán hàng</p>
              <button type="button" className="dc-btn-secondary" onClick={() => setCreatorLinks((items) => [...items, { platform: "tiktok", url: "", handle: "", followerCount: 0 }])}>Thêm liên kết</button>
            </div>
            {creatorLinks.map((item, index) => (
              <div key={`${index}-${item.platform}`} className="grid gap-2 rounded-xl border border-zinc-200 bg-zinc-50 p-3 sm:grid-cols-[8rem_minmax(0,1fr)]">
                <select className="dc-input bg-white" value={item.platform} onChange={(event) => setCreatorLinks((items) => items.map((link, itemIndex) => itemIndex === index ? { ...link, platform: event.target.value as CreatorLink["platform"] } : link))}>
                  {CREATOR_PLATFORMS.map((platform) => <option key={platform} value={platform}>{CREATOR_PLATFORM_LABELS[platform]}</option>)}
                </select>
                <input className="dc-input bg-white" inputMode="url" placeholder="https://..." value={item.url} onChange={(event) => setCreatorLinks((items) => items.map((link, itemIndex) => itemIndex === index ? { ...link, url: event.target.value } : link))} />
                <input className="dc-input bg-white" placeholder="@ten_tai_khoan" value={item.handle} onChange={(event) => setCreatorLinks((items) => items.map((link, itemIndex) => itemIndex === index ? { ...link, handle: event.target.value } : link))} />
                <input
                  className="dc-input bg-white"
                  inputMode="numeric"
                  placeholder="Số lượng follower"
                  value={formatFollowerCount(item.followerCount)}
                  onChange={(event) => setCreatorLinks((items) => items.map((link, itemIndex) => itemIndex === index ? { ...link, followerCount: parseFollowerCount(event.target.value) } : link))}
                />
                <div className="sm:col-span-2">
                  <button type="button" className="dc-btn-secondary text-red-700" onClick={() => setCreatorLinks((items) => items.filter((_, itemIndex) => itemIndex !== index))}>Xóa</button>
                </div>
              </div>
            ))}
            <p className="text-xs font-medium text-zinc-500">Mỗi liên kết cần đủ URL, tên tài khoản hoặc ID kênh, và số lượng follower hiện tại.</p>
          </div>
          <button className="dc-btn-primary" disabled={submitting} type="submit">{submitting ? "Đang tạo..." : "Trở thành Creator"}</button>
        </form>
      )}
      {data.creatorApplication?.rejectReason ? <p className="mt-2 text-sm text-red-700">Lý do: {String(data.creatorApplication.rejectReason)}</p> : null}
    </article>
  );
}

export function BrandUpgradeForm({ data, onError, onSuccess }: { data: UpgradeSnapshot; onError: (message: string) => void; onSuccess: (message: string) => void }) {
  const router = useRouter();
  const [form, setForm] = useState({ brandName: "", description: "", contactName: "", contactPhone: "", contactEmail: "", website: "" });
  const [selectedIndustries, setSelectedIndustries] = useState<string[]>([]);
  const [otherIndustry, setOtherIndustry] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const brandStatus = data.brandApplication?.status as string | undefined;
  const hasBrand = (data.account.brandMemberships?.length ?? 0) > 0;

  async function submit(event: FormEvent) {
    event.preventDefault();
    onError("");
    onSuccess("");
    let industries: string[];
    try {
      industries = resolveSelectedIndustries(selectedIndustries, otherIndustry);
    } catch (validationError) {
      onError(validationError instanceof Error ? validationError.message : "Vui lòng chọn ít nhất 1 ngành hàng.");
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch("/api/brand/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, selectedIndustries: industries, industry: industries.join(", ") })
      });
      const payload = await response.json();
      if (!response.ok || !payload.success) throw new Error(payload.error ?? "Tạo Brand thất bại");
      onSuccess("Brand đã được tạo. Bạn có thể bắt đầu thiết lập sản phẩm/campaign.");
      router.push("/dashboard/brand?created=1");
      router.refresh();
    } catch (requestError) {
      onError(requestError instanceof Error ? requestError.message : "Tạo Brand thất bại");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <article className="dc-card p-5">
      <h2 className="text-xl font-bold">Nâng cấp Brand</h2>
      <p className="mt-2 text-sm">Trạng thái: <span className="font-semibold">{hasBrand ? "Brand đã được tạo" : statusText(brandStatus)}</span></p>
      {hasBrand ? <Link className="dc-btn-primary mt-4 inline-flex" href="/dashboard/brand">Vào Bảng điều khiển Nhãn hàng</Link> : (
        <form className="mt-4 grid gap-3" onSubmit={submit}>
          <input className="dc-input" placeholder="Tên nhãn hàng" value={form.brandName} onChange={(event) => setForm((current) => ({ ...current, brandName: event.target.value }))} required />
          <div className="grid gap-2">
            <p className="text-sm font-semibold text-zinc-700">Ngành hàng</p>
            <div className="flex flex-wrap gap-2">
              {INDUSTRY_OPTIONS.map((industry) => {
                const selected = selectedIndustries.includes(industry);
                return <button key={industry} type="button" className={`rounded-full border px-3 py-1.5 text-sm font-medium transition ${selected ? "border-zinc-900 bg-zinc-900 text-white" : "border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-100"}`} onClick={() => setSelectedIndustries((items) => selected ? items.filter((item) => item !== industry) : [...items, industry])}>{industry}</button>;
              })}
            </div>
            {selectedIndustries.includes("Khác") ? <input className="dc-input" placeholder="Nhập ngành hàng khác" value={otherIndustry} onChange={(event) => setOtherIndustry(event.target.value)} /> : null}
          </div>
          <textarea className="dc-input min-h-20" placeholder="Mô tả ngắn" value={form.description} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} />
          <input className="dc-input" placeholder="Tên người liên hệ" value={form.contactName} onChange={(event) => setForm((current) => ({ ...current, contactName: event.target.value }))} required />
          <input className="dc-input" placeholder="Số điện thoại liên hệ" value={form.contactPhone} onChange={(event) => setForm((current) => ({ ...current, contactPhone: event.target.value }))} required />
          <input className="dc-input" placeholder="Email liên hệ" type="email" value={form.contactEmail} onChange={(event) => setForm((current) => ({ ...current, contactEmail: event.target.value }))} required />
          <input className="dc-input" placeholder="Website" type="url" value={form.website} onChange={(event) => setForm((current) => ({ ...current, website: event.target.value }))} />
          <button className="dc-btn-primary" disabled={submitting} type="submit">{submitting ? "Đang tạo..." : "Tạo Brand mới"}</button>
        </form>
      )}
      {data.brandApplication?.rejectReason ? <p className="mt-2 text-sm text-red-700">Lý do: {String(data.brandApplication.rejectReason)}</p> : null}
    </article>
  );
}
