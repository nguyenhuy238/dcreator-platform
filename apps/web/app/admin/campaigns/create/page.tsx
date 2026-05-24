"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { ErrorState, PageHeader } from "@/app/components/dcreator/ui/base";

type CampaignCategory = "TECH" | "FASHION" | "FOOD" | "BEAUTY" | "LIFESTYLE" | "EDUCATION";
type CampaignType = "DONATION" | "PREORDER" | "SPONSORSHIP" | "COMMUNITY";
type SetupSource = "JOIN_EXISTING_DCREATOR_CAMP" | "BRAND_REQUESTED";

type FormState = {
  brandAccountId: string;
  slug: string;
  title: string;
  brief: string;
  budgetVnd: number;
  targetAmountVnd: number;
  category: CampaignCategory;
  campaignType: CampaignType;
  setupSource: SetupSource;
  objective: string;
  priorityChannels: string;
  missionTypes: string;
  creatorCommissionPercent: number;
  userCommissionPercent: number;
  bonusBudgetVnd: number;
  startsAt: string;
  endsAt: string;
  publishNow: boolean;
};

type ApiResponse<T> = { success: true; data: T } | { success: false; error: string };

const defaultForm: FormState = {
  brandAccountId: "",
  slug: "",
  title: "",
  brief: "",
  budgetVnd: 10000000,
  targetAmountVnd: 10000000,
  category: "LIFESTYLE",
  campaignType: "COMMUNITY",
  setupSource: "BRAND_REQUESTED",
  objective: "",
  priorityChannels: "",
  missionTypes: "",
  creatorCommissionPercent: 0,
  userCommissionPercent: 0,
  bonusBudgetVnd: 0,
  startsAt: "",
  endsAt: "",
  publishNow: false
};

function toDateTime(value: string) {
  return value ? new Date(value).toISOString() : undefined;
}

export default function AdminCreateCampaignPage() {
  const [form, setForm] = useState<FormState>(defaultForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  function setField<K extends keyof FormState>(name: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [name]: value }));
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const response = await fetch("/api/admin/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          startsAt: toDateTime(form.startsAt),
          endsAt: toDateTime(form.endsAt)
        })
      });
      const payload = (await response.json()) as ApiResponse<{ id: string; title: string }>;
      if (!response.ok || !payload.success) throw new Error(payload.success ? "Không thể tạo campaign" : payload.error);
      setSuccess(`Đã tạo campaign: ${payload.data.title}`);
      setForm(defaultForm);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Không thể tạo campaign");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <PageHeader
        title="Tạo campaign (Admin)"
        subtitle="Admin có thể tạo campaign trực tiếp theo cấu trúc giống luồng Brand."
        action={<Link href="/admin/campaigns" className="dc-btn-secondary">Quay lại duyệt campaign</Link>}
      />

      {error ? <div className="mt-4"><ErrorState title="Tạo campaign thất bại" description={error} /></div> : null}
      {success ? <p className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{success}</p> : null}

      <form className="dc-card mt-6 grid gap-4 p-5" onSubmit={submit}>
        <div className="grid gap-4 md:grid-cols-2">
          <label className="grid gap-2 text-sm font-semibold text-zinc-700">
            <span>Brand Account ID</span>
            <input className="dc-input" value={form.brandAccountId} onChange={(event) => setField("brandAccountId", event.target.value)} placeholder="ID account của Brand owner" required />
          </label>
          <label className="grid gap-2 text-sm font-semibold text-zinc-700">
            <span>Slug</span>
            <input className="dc-input" value={form.slug} onChange={(event) => setField("slug", event.target.value)} placeholder="vd: tet-sale-2026" required />
          </label>
          <label className="grid gap-2 text-sm font-semibold text-zinc-700 md:col-span-2">
            <span>Tên campaign</span>
            <input className="dc-input" value={form.title} onChange={(event) => setField("title", event.target.value)} required />
          </label>
          <label className="grid gap-2 text-sm font-semibold text-zinc-700 md:col-span-2">
            <span>Brief</span>
            <textarea className="dc-input min-h-28" value={form.brief} onChange={(event) => setField("brief", event.target.value)} required />
          </label>

          <label className="grid gap-2 text-sm font-semibold text-zinc-700">
            <span>Budget (VND)</span>
            <input className="dc-input" type="number" min={1} value={form.budgetVnd} onChange={(event) => setField("budgetVnd", Number(event.target.value))} />
          </label>
          <label className="grid gap-2 text-sm font-semibold text-zinc-700">
            <span>Target amount (VND)</span>
            <input className="dc-input" type="number" min={1} value={form.targetAmountVnd} onChange={(event) => setField("targetAmountVnd", Number(event.target.value))} />
          </label>
          <label className="grid gap-2 text-sm font-semibold text-zinc-700">
            <span>Category</span>
            <select className="dc-input" value={form.category} onChange={(event) => setField("category", event.target.value as CampaignCategory)}>
              <option value="LIFESTYLE">LIFESTYLE</option>
              <option value="FOOD">FOOD</option>
              <option value="BEAUTY">BEAUTY</option>
              <option value="FASHION">FASHION</option>
              <option value="TECH">TECH</option>
              <option value="EDUCATION">EDUCATION</option>
            </select>
          </label>
          <label className="grid gap-2 text-sm font-semibold text-zinc-700">
            <span>Campaign type</span>
            <select className="dc-input" value={form.campaignType} onChange={(event) => setField("campaignType", event.target.value as CampaignType)}>
              <option value="COMMUNITY">COMMUNITY</option>
              <option value="SPONSORSHIP">SPONSORSHIP</option>
              <option value="PREORDER">PREORDER</option>
              <option value="DONATION">DONATION</option>
            </select>
          </label>
          <label className="grid gap-2 text-sm font-semibold text-zinc-700">
            <span>Setup source</span>
            <select className="dc-input" value={form.setupSource} onChange={(event) => setField("setupSource", event.target.value as SetupSource)}>
              <option value="BRAND_REQUESTED">BRAND_REQUESTED</option>
              <option value="JOIN_EXISTING_DCREATOR_CAMP">JOIN_EXISTING_DCREATOR_CAMP</option>
            </select>
          </label>
          <label className="grid gap-2 text-sm font-semibold text-zinc-700">
            <span>Creator commission (%)</span>
            <input className="dc-input" type="number" min={0} max={100} value={form.creatorCommissionPercent} onChange={(event) => setField("creatorCommissionPercent", Number(event.target.value))} />
          </label>
          <label className="grid gap-2 text-sm font-semibold text-zinc-700">
            <span>User commission (%)</span>
            <input className="dc-input" type="number" min={0} max={100} value={form.userCommissionPercent} onChange={(event) => setField("userCommissionPercent", Number(event.target.value))} />
          </label>
          <label className="grid gap-2 text-sm font-semibold text-zinc-700">
            <span>Bonus budget (VND)</span>
            <input className="dc-input" type="number" min={0} value={form.bonusBudgetVnd} onChange={(event) => setField("bonusBudgetVnd", Number(event.target.value))} />
          </label>

          <label className="grid gap-2 text-sm font-semibold text-zinc-700 md:col-span-2">
            <span>Objective</span>
            <textarea className="dc-input min-h-24" value={form.objective} onChange={(event) => setField("objective", event.target.value)} />
          </label>
          <label className="grid gap-2 text-sm font-semibold text-zinc-700">
            <span>Priority channels</span>
            <input className="dc-input" value={form.priorityChannels} onChange={(event) => setField("priorityChannels", event.target.value)} />
          </label>
          <label className="grid gap-2 text-sm font-semibold text-zinc-700">
            <span>Mission types</span>
            <input className="dc-input" value={form.missionTypes} onChange={(event) => setField("missionTypes", event.target.value)} />
          </label>

          <label className="grid gap-2 text-sm font-semibold text-zinc-700">
            <span>Starts at</span>
            <input className="dc-input" type="datetime-local" value={form.startsAt} onChange={(event) => setField("startsAt", event.target.value)} />
          </label>
          <label className="grid gap-2 text-sm font-semibold text-zinc-700">
            <span>Ends at</span>
            <input className="dc-input" type="datetime-local" value={form.endsAt} onChange={(event) => setField("endsAt", event.target.value)} />
          </label>
        </div>

        <label className="flex items-center gap-2 text-sm font-medium text-zinc-700">
          <input
            type="checkbox"
            checked={form.publishNow}
            onChange={(event) => setField("publishNow", event.target.checked)}
          />
          Publish ngay sau khi tạo (ACTIVE)
        </label>

        <div className="flex justify-end">
          <button className="dc-btn-primary" type="submit" disabled={saving}>
            {saving ? "Đang tạo..." : "Tạo campaign"}
          </button>
        </div>
      </form>
    </>
  );
}

