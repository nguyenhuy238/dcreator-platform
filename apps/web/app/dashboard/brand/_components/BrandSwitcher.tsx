"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { setCurrentBrandInContext, useCurrentBrand, useSetCurrentBrand } from "@/app/dashboard/brand/_hooks/use-brand-context";

function brandRoleLabel(role: string) {
  if (role === "OWNER") return "Chủ sở hữu";
  if (role === "MANAGER") return "Quản lý";
  if (role === "STAFF") return "Nhân sự";
  return role;
}

export function BrandSwitcher({ className = "mb-4", inline = false }: { className?: string; inline?: boolean }) {
  const router = useRouter();
  const { currentBrandId, brands, isLoading, error } = useCurrentBrand();
  const setCurrentBrand = useSetCurrentBrand();
  const [isSaving, setIsSaving] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  if (isLoading) {
    return <div className={`${className} h-10 w-56 animate-pulse rounded-xl bg-zinc-100`} />;
  }
  if (error) {
    return <div className={`${className} rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700`}>{error}</div>;
  }
  if (brands.length === 0) {
    return (
      <div className={`${className} rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-700`}>
        <p>Bạn chưa thuộc nhãn hàng nào.</p>
        <Link href="/brand/register" className="mt-2 inline-flex rounded-lg bg-zinc-900 px-3 py-2 text-sm font-semibold text-white hover:bg-zinc-800">
          Tạo nhãn hàng mới
        </Link>
      </div>
    );
  }

  return (
    <div className={inline ? className : `${className} rounded-xl border border-zinc-200 bg-white px-4 py-3`}>
      <div className="flex flex-wrap items-center gap-3">
        <label htmlFor="brand-switcher" className="text-sm font-semibold text-zinc-700">Nhãn hàng hiện tại</label>
        <select
          id="brand-switcher"
          className="dc-input max-w-xs"
          value={currentBrandId ?? brands[0]!.id}
          disabled={isSaving}
          onChange={async (event) => {
            const nextBrandId = event.target.value;
            setLocalError(null);
            setIsSaving(true);
            try {
              await setCurrentBrand(nextBrandId);
              setCurrentBrandInContext(nextBrandId);
              router.refresh();
            } catch (switchError) {
              setLocalError(switchError instanceof Error ? switchError.message : "Không thể chuyển nhãn hàng");
            } finally {
              setIsSaving(false);
            }
          }}
        >
          {brands.map((brand) => (
            <option key={brand.id} value={brand.id}>
              {brand.name} ({brandRoleLabel(brand.role)})
            </option>
          ))}
        </select>
      </div>
      {localError ? <p className="mt-2 text-sm text-red-600">{localError}</p> : null}
    </div>
  );
}
