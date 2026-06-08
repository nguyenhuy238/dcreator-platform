"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Role } from "@prisma/client";
import { trackEvent } from "@/lib/analytics";
import { AnalyticsEvents } from "@/lib/analytics-events";
import {
  BRAND_LINK_PLATFORMS,
  CREATOR_PLATFORMS,
  normalizeBrandLinks,
  normalizeCreatorLinks,
  resolveSelectedIndustries,
  type BrandLink,
  type BrandLinkPlatform,
  type CreatorLink
} from "@/lib/profile-upgrade-form";
import { ClickableUrl } from "@/app/components/dcreator/ui/clickable-url";

export type UpgradeSnapshot = {
  account: {
    displayName: string;
    roles: Role[];
    brandMemberships?: Array<{ id: string; name: string; role: string; website?: string | null; brandLinks?: unknown }>;
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
const BRAND_LINK_PLACEHOLDERS: Record<BrandLinkPlatform, string> = {
  website: "https://brand.vn",
  tiktok: "https://www.tiktok.com/@brand",
  tiktok_shop: "https://shop.tiktok.com/...",
  shopee: "https://shopee.vn/...",
  facebook: "https://facebook.com/...",
  instagram: "https://instagram.com/...",
  youtube: "https://youtube.com/@brand",
  lazada: "https://www.lazada.vn/shop/...",
  other: "https://..."
};

type UpgradeFormProps = {
  data: UpgradeSnapshot;
  onError: (message: string) => void;
  onSuccess: (message: string) => void;
  embedded?: boolean;
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

function wrapperClassName(embedded: boolean) {
  return embedded ? "grid gap-3" : "dc-card p-5";
}

function statusClassName(embedded: boolean) {
  return embedded ? "text-sm" : "mt-2 text-sm";
}

async function waitForRoleAccess(target: "brand" | "creator", expectedBrandId?: string) {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const response = await fetch("/api/profile/role-upgrade", { cache: "no-store" });
    const payload = await response.json();
    const account = payload.data?.account as UpgradeSnapshot["account"] | undefined;
    if (response.ok && payload.success && account) {
      const hasCreator = target === "creator" && (account.hasCreatorProfile || account.roles.includes("CREATOR"));
      const hasBrand = target === "brand" && (account.brandMemberships ?? []).some((brand) => !expectedBrandId || brand.id === expectedBrandId);
      if (hasCreator || hasBrand) return;
    }
    await new Promise((resolve) => window.setTimeout(resolve, 250));
  }
  throw new Error(target === "brand" ? "Brand đã tạo nhưng quyền dashboard chưa sẵn sàng. Vui lòng thử lại sau ít giây." : "Creator đã tạo nhưng quyền dashboard chưa sẵn sàng. Vui lòng thử lại sau ít giây.");
}

function parseBrandLinks(value: unknown, fallbackWebsite?: string | null): BrandLink[] {
  const parsed = Array.isArray(value)
    ? value.filter((item): item is BrandLink => {
        if (!item || typeof item !== "object") return false;
        const candidate = item as { platform?: unknown; url?: unknown };
        return typeof candidate.url === "string" && BRAND_LINK_PLATFORMS.includes(candidate.platform as BrandLinkPlatform);
      })
    : [];
  if (parsed.length > 0) return parsed;
  return fallbackWebsite ? [{ platform: "website", url: fallbackWebsite }] : [];
}

export function CreatorUpgradeForm({ data, onError, onSuccess, embedded = false }: UpgradeFormProps) {
  const router = useRouter();
  const [form, setForm] = useState({ displayName: "", bio: "", avatarUrl: "" });
  const [creatorLinks, setCreatorLinks] = useState<CreatorLink[]>([{ platform: "tiktok", url: "", handle: "", followerCount: 0 }]);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const creatorStatus = data.creatorApplication?.status as string | undefined;
  const isCreator = Boolean(data.account.hasCreatorProfile) || data.account.roles.includes("CREATOR");

  async function submit(event: FormEvent) {
    event.preventDefault();
    onError("");
    onSuccess("");
    trackEvent(AnalyticsEvents.CREATOR_UPGRADE_SUBMIT, { role: "creator" });
    let normalizedLinks: CreatorLink[];
    try {
      normalizedLinks = normalizeCreatorLinks(creatorLinks);
    } catch (validationError) {
      trackEvent(AnalyticsEvents.CREATOR_UPGRADE_FAILED, { role: "creator" });
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
          avatarUrl: form.avatarUrl,
          bio: form.bio,
          creatorLinks: normalizedLinks
        })
      });
      const payload = await response.json();
      if (!response.ok || !payload.success) throw new Error(payload.error ?? "Gửi đơn Creator thất bại");
      await waitForRoleAccess("creator");
      router.refresh();
      trackEvent(AnalyticsEvents.CREATOR_UPGRADE_SUCCESS, { role: "creator" });
      onSuccess("Creator Profile đã được tạo cùng các liên kết mạng xã hội.");
      router.replace("/dashboard/creator?created=1");
    } catch (requestError) {
      trackEvent(AnalyticsEvents.CREATOR_UPGRADE_FAILED, { role: "creator" });
      onError(requestError instanceof Error ? requestError.message : "Gửi đơn Creator thất bại");
    } finally {
      setSubmitting(false);
    }
  }

  async function uploadCreatorAvatar(file: File) {
    onError("");
    if (!file.type.startsWith("image/")) {
      onError("Ảnh Creator phải là file ảnh.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      onError("Ảnh Creator vượt quá 5MB.");
      return;
    }

    setUploadingAvatar(true);
    try {
      const formData = new FormData();
      formData.append("avatar", file);
      const response = await fetch("/api/uploads/creator-avatar", { method: "POST", body: formData });
      const payload = await response.json();
      if (!response.ok || !payload.success || !payload.data?.avatarUrl) {
        throw new Error(payload.error ?? "Tải ảnh Creator thất bại.");
      }
      setForm((current) => ({ ...current, avatarUrl: payload.data.avatarUrl }));
    } catch (requestError) {
      onError(requestError instanceof Error ? requestError.message : "Tải ảnh Creator thất bại.");
    } finally {
      setUploadingAvatar(false);
    }
  }

  return (
    <article className={wrapperClassName(embedded)}>
      {!embedded ? <h2 className="text-xl font-bold">Nâng cấp Creator</h2> : null}
      <p className={statusClassName(embedded)}>
        Trạng thái: <span className="font-semibold">{isCreator ? "Creator Profile đã được tạo" : statusText(creatorStatus)}</span>
      </p>
      {isCreator || creatorStatus === "APPROVED" || creatorStatus === "PENDING_REVIEW" ? (
        <div className="mt-4 grid gap-2">
          <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-700">
            Xác minh danh tính giúp mở khóa payout.
          </p>
          <Link className="dc-btn-primary inline-flex w-fit" href="/dashboard/creator">
            Vào Bảng điều khiển Nhà sáng tạo
          </Link>
        </div>
      ) : (
        <form className="mt-4 grid gap-3" onSubmit={submit}>
          <input className="dc-input" placeholder="Tên hiển thị" value={form.displayName} onChange={(event) => setForm((current) => ({ ...current, displayName: event.target.value }))} required />
          <div className="grid gap-2 rounded-xl border border-zinc-200 bg-zinc-50 p-3">
            <p className="text-sm font-semibold text-zinc-700">Avatar Creator</p>
            <div className="flex flex-wrap items-center gap-3">
              {form.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={form.avatarUrl} alt="Avatar Creator" className="h-14 w-14 rounded-xl border border-zinc-200 object-cover" />
              ) : (
                <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-white text-sm font-black text-zinc-400 ring-1 ring-zinc-200">CR</div>
              )}
              <label className={`dc-btn-secondary cursor-pointer ${uploadingAvatar ? "pointer-events-none opacity-60" : ""}`}>
                {uploadingAvatar ? "Đang tải..." : "Tải avatar Creator"}
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  className="hidden"
                  disabled={uploadingAvatar || submitting}
                  onChange={(event) => {
                    const file = event.target.files?.[0] ?? null;
                    if (file) void uploadCreatorAvatar(file);
                    event.target.value = "";
                  }}
                />
              </label>
            </div>
            <p className="text-xs text-zinc-500">Avatar này chỉ dùng cho hồ sơ Creator, không thay đổi ảnh tài khoản cá nhân.</p>
          </div>
          <textarea className="dc-input min-h-24" placeholder="Giới thiệu bản thân" value={form.bio} onChange={(event) => setForm((current) => ({ ...current, bio: event.target.value }))} />
          <div className="grid gap-2">
            <p className="text-sm font-semibold text-zinc-700">Liên kết mạng xã hội / kênh bán hàng</p>
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
                <div className="flex flex-wrap gap-2 sm:col-span-2">
                  <button
                    type="button"
                    className="dc-btn-secondary text-red-700"
                    onClick={() => setCreatorLinks((items) => items.length > 1 ? items.filter((_, itemIndex) => itemIndex !== index) : [{ platform: "tiktok", url: "", handle: "", followerCount: 0 }])}
                  >
                    Xóa
                  </button>
                  {index === creatorLinks.length - 1 ? (
                    <button type="button" className="dc-btn-secondary" onClick={() => setCreatorLinks((items) => [...items, { platform: "tiktok", url: "", handle: "", followerCount: 0 }])}>
                      Thêm liên kết
                    </button>
                  ) : null}
                </div>
              </div>
            ))}
            <p className="text-xs font-medium text-zinc-500">Mỗi liên kết cần đủ URL, tên tài khoản hoặc ID kênh, và số lượng follower hiện tại.</p>
          </div>
          <button className="dc-btn-primary" disabled={submitting} type="submit">
            {submitting ? "Đang tạo..." : "Trở thành Creator"}
          </button>
        </form>
      )}
      {data.creatorApplication && "rejectReason" in data.creatorApplication && data.creatorApplication.rejectReason ? (
        <p className="mt-2 text-sm text-red-700">Lý do: {String(data.creatorApplication.rejectReason)}</p>
      ) : null}
    </article>
  );
}

export function BrandUpgradeForm({ data, onError, onSuccess, embedded = false }: UpgradeFormProps) {
  const router = useRouter();
  const [form, setForm] = useState({ brandName: "", description: "", contactName: "", contactPhone: "", contactEmail: "", logoUrl: "" });
  const [brandLinks, setBrandLinks] = useState<BrandLink[]>([{ platform: "website", url: "" }]);
  const [linkErrors, setLinkErrors] = useState<Record<number, string>>({});
  const [selectedIndustries, setSelectedIndustries] = useState<string[]>([]);
  const [otherIndustry, setOtherIndustry] = useState("");
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const brandStatus = data.brandApplication?.status as string | undefined;
  const hasBrand = (data.account.brandMemberships?.length ?? 0) > 0;
  const savedBrandLinks = parseBrandLinks(data.account.brandMemberships?.[0]?.brandLinks, data.account.brandMemberships?.[0]?.website);

  function addBrandLink() {
    const used = new Set(brandLinks.map((item) => item.platform));
    const nextPlatform = BRAND_LINK_PLATFORMS.find((platform) => platform === "other" || !used.has(platform)) ?? "other";
    setBrandLinks((items) => [...items, { platform: nextPlatform, url: "" }]);
  }

  function validateBrandLinks() {
    const nextErrors: Record<number, string> = {};
    const seen = new Set<BrandLinkPlatform>();
    brandLinks.forEach((item, index) => {
      if (!item.url.trim()) return;
      if (item.platform !== "other" && seen.has(item.platform)) {
        nextErrors[index] = "Platform này đã được chọn. Vui lòng chọn nền tảng khác.";
        return;
      }
      seen.add(item.platform);
      try {
        normalizeBrandLinks([item]);
      } catch {
        nextErrors[index] = "URL không hợp lệ. Vui lòng nhập đủ https://...";
      }
    });
    setLinkErrors(nextErrors);
    return nextErrors;
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    onError("");
    onSuccess("");
    trackEvent(AnalyticsEvents.BRAND_UPGRADE_SUBMIT, { role: "brand" });
    let industries: string[];
    let normalizedLinks: BrandLink[];
    try {
      industries = resolveSelectedIndustries(selectedIndustries, otherIndustry);
      const nextLinkErrors = validateBrandLinks();
      if (Object.values(nextLinkErrors).some(Boolean)) return;
      normalizedLinks = normalizeBrandLinks(brandLinks);
    } catch (validationError) {
      trackEvent(AnalyticsEvents.BRAND_UPGRADE_FAILED, { role: "brand" });
      onError(validationError instanceof Error ? validationError.message : "Vui lòng kiểm tra ngành hàng và liên kết.");
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch("/api/brand/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, brandLinks: normalizedLinks, website: normalizedLinks.find((item) => item.platform === "website")?.url ?? "", selectedIndustries: industries, industry: industries.join(", ") })
      });
      const payload = await response.json();
      if (!response.ok || !payload.success) throw new Error(payload.error ?? "Tạo Brand thất bại");
      await waitForRoleAccess("brand", payload.data?.id);
      router.refresh();
      trackEvent(AnalyticsEvents.BRAND_UPGRADE_SUCCESS, {
        role: "brand",
        brand_id: payload.data?.id
      });
      onSuccess("Brand đã được tạo. Bạn có thể bắt đầu thiết lập sản phẩm/campaign.");
      router.replace("/dashboard/brand?created=1");
    } catch (requestError) {
      trackEvent(AnalyticsEvents.BRAND_UPGRADE_FAILED, { role: "brand" });
      onError(requestError instanceof Error ? requestError.message : "Tạo Brand thất bại");
    } finally {
      setSubmitting(false);
    }
  }

  async function uploadBrandLogo(file: File) {
    onError("");
    if (!["image/jpeg", "image/png", "image/webp", "image/svg+xml"].includes(file.type)) {
      onError("Logo Brand phải là JPG, PNG, WebP hoặc SVG.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      onError("Logo Brand vượt quá 5MB.");
      return;
    }

    setUploadingLogo(true);
    try {
      const formData = new FormData();
      formData.append("logo", file);
      const response = await fetch("/api/uploads/brand-logo", { method: "POST", body: formData });
      const payload = await response.json();
      if (!response.ok || !payload.success || !payload.data?.logoUrl) {
        throw new Error(payload.error ?? "Tải logo Brand thất bại.");
      }
      setForm((current) => ({ ...current, logoUrl: payload.data.logoUrl }));
    } catch (requestError) {
      onError(requestError instanceof Error ? requestError.message : "Tải logo Brand thất bại.");
    } finally {
      setUploadingLogo(false);
    }
  }

  return (
    <article className={wrapperClassName(embedded)}>
      {!embedded ? <h2 className="text-xl font-bold">Nâng cấp Brand</h2> : null}
      <p className={statusClassName(embedded)}>
        Trạng thái: <span className="font-semibold">{hasBrand ? "Brand đã được tạo" : statusText(brandStatus)}</span>
      </p>
      {hasBrand ? (
        <div className="mt-4 grid gap-3">
          <Link className="dc-btn-primary inline-flex w-fit" href="/dashboard/brand">
            Vào Bảng điều khiển Nhãn hàng
          </Link>
          {savedBrandLinks.length > 0 ? (
            <div className="rounded-2xl border border-zinc-100 bg-zinc-50 p-3">
              <p className="text-sm font-semibold text-zinc-800">Website / kênh đã lưu</p>
              <div className="mt-2 grid gap-2">
                {savedBrandLinks.map((item, index) => (
                  <div key={`${item.platform}-${index}`} className="text-sm">
                    <span className="font-semibold text-zinc-700">{BRAND_LINK_LABELS[item.platform]}: </span>
                    <ClickableUrl url={item.url} label={item.url} className="break-all font-medium text-zinc-600 underline decoration-zinc-300 underline-offset-4 hover:text-zinc-900" />
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      ) : (
        <form className="mt-4 grid gap-3" onSubmit={submit}>
          <input className="dc-input" placeholder="Tên nhãn hàng" value={form.brandName} onChange={(event) => setForm((current) => ({ ...current, brandName: event.target.value }))} required />
          <div className="grid gap-2 rounded-xl border border-zinc-200 bg-zinc-50 p-3">
            <p className="text-sm font-semibold text-zinc-700">Logo Brand</p>
            <div className="flex flex-wrap items-center gap-3">
              {form.logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={form.logoUrl} alt="Logo Brand" className="h-14 w-14 rounded-xl border border-zinc-200 bg-white object-contain p-1" />
              ) : (
                <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-white text-sm font-black text-zinc-400 ring-1 ring-zinc-200">BR</div>
              )}
              <label className={`dc-btn-secondary cursor-pointer ${uploadingLogo ? "pointer-events-none opacity-60" : ""}`}>
                {uploadingLogo ? "Đang tải..." : "Tải logo Brand"}
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/svg+xml"
                  className="hidden"
                  disabled={uploadingLogo || submitting}
                  onChange={(event) => {
                    const file = event.target.files?.[0] ?? null;
                    if (file) void uploadBrandLogo(file);
                    event.target.value = "";
                  }}
                />
              </label>
            </div>
            <p className="text-xs text-zinc-500">Logo này chỉ dùng cho Brand, không thay đổi ảnh tài khoản hay avatar Creator.</p>
          </div>
          <div className="grid gap-2">
            <p className="text-sm font-semibold text-zinc-700">Ngành hàng</p>
            <div className="flex flex-wrap gap-2">
              {INDUSTRY_OPTIONS.map((industry) => {
                const selected = selectedIndustries.includes(industry);
                return (
                  <button
                    key={industry}
                    type="button"
                    className={`rounded-full border px-3 py-1.5 text-sm font-medium transition ${selected ? "border-zinc-900 bg-zinc-900 text-white" : "border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-100"}`}
                    onClick={() => setSelectedIndustries((items) => selected ? items.filter((item) => item !== industry) : [...items, industry])}
                  >
                    {industry}
                  </button>
                );
              })}
            </div>
            {selectedIndustries.includes("Khác") ? <input className="dc-input" placeholder="Nhập ngành hàng khác" value={otherIndustry} onChange={(event) => setOtherIndustry(event.target.value)} /> : null}
          </div>
          <textarea className="dc-input min-h-20" placeholder="Mô tả ngắn" value={form.description} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} />
          <input className="dc-input" placeholder="Tên người liên hệ" value={form.contactName} onChange={(event) => setForm((current) => ({ ...current, contactName: event.target.value }))} required />
          <input className="dc-input" placeholder="Số điện thoại liên hệ" value={form.contactPhone} onChange={(event) => setForm((current) => ({ ...current, contactPhone: event.target.value }))} required />
          <input className="dc-input" placeholder="Email liên hệ" type="email" value={form.contactEmail} onChange={(event) => setForm((current) => ({ ...current, contactEmail: event.target.value }))} required />
          <div className="grid gap-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-semibold text-zinc-700">Website / kênh bán hàng / mạng xã hội</p>
              <button type="button" className="dc-btn-secondary" onClick={addBrandLink}>
                Thêm link
              </button>
            </div>
            {brandLinks.map((item, index) => {
              const selectedPlatforms = new Set(brandLinks.map((link, linkIndex) => linkIndex === index ? "" : link.platform));
              return (
                <div key={`${index}-${item.platform}`} className="grid gap-2 rounded-xl border border-zinc-200 bg-zinc-50 p-3 sm:grid-cols-[12rem_minmax(0,1fr)_auto]">
                  <select
                    className="dc-input bg-white"
                    value={item.platform}
                    onChange={(event) => {
                      const platform = event.target.value as BrandLinkPlatform;
                      setBrandLinks((items) => items.map((link, itemIndex) => itemIndex === index ? { ...link, platform } : link));
                      setLinkErrors((current) => ({ ...current, [index]: "" }));
                    }}
                  >
                    {BRAND_LINK_PLATFORMS.map((platform) => (
                      <option key={platform} value={platform} disabled={platform !== "other" && selectedPlatforms.has(platform)}>
                        {BRAND_LINK_LABELS[platform]}
                      </option>
                    ))}
                  </select>
                  <div className="grid gap-1">
                    <input
                      className={`dc-input bg-white ${linkErrors[index] ? "border-red-500 ring-1 ring-red-300" : ""}`}
                      inputMode="url"
                      placeholder={BRAND_LINK_PLACEHOLDERS[item.platform]}
                      value={item.url}
                      onChange={(event) => {
                        setBrandLinks((items) => items.map((link, itemIndex) => itemIndex === index ? { ...link, url: event.target.value } : link));
                        setLinkErrors((current) => ({ ...current, [index]: "" }));
                      }}
                      onBlur={validateBrandLinks}
                    />
                    {linkErrors[index] ? <span className="text-xs text-red-600">{linkErrors[index]}</span> : null}
                  </div>
                  <button type="button" className="dc-btn-secondary h-fit text-red-700" onClick={() => setBrandLinks((items) => items.length > 1 ? items.filter((_, itemIndex) => itemIndex !== index) : [{ platform: "website", url: "" }])}>
                    Xóa
                  </button>
                </div>
              );
            })}
            <p className="text-xs font-medium text-zinc-500">Có thể bỏ trống link chưa dùng. Các platform không được trùng, trừ mục Khác.</p>
          </div>
          <button className="dc-btn-primary" disabled={submitting} type="submit">
            {submitting ? "Đang tạo..." : "Tạo Brand mới"}
          </button>
        </form>
      )}
      {data.brandApplication && "rejectReason" in data.brandApplication && data.brandApplication.rejectReason ? (
        <p className="mt-2 text-sm text-red-700">Lý do: {String(data.brandApplication.rejectReason)}</p>
      ) : null}
    </article>
  );
}
