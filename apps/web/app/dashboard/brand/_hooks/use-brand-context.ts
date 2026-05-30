"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

type BrandMembership = { id: string; name: string; role: "OWNER" | "MANAGER" | "STAFF" };
type BrandContextPayload = { currentBrandId: string; brands: BrandMembership[] };

export function useMyBrands() {
  const [data, setData] = useState<BrandContextPayload | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/brand/current", { cache: "no-store" });
      const payload = await response.json();
      if (!response.ok || !payload?.success) throw new Error(payload?.error ?? "Không thể tải danh sách Brand");
      setData(payload.data as BrandContextPayload);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không thể tải danh sách Brand");
      setData(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { data, isLoading, error, reload };
}

export function useCurrentBrand() {
  const { data, isLoading, error, reload } = useMyBrands();
  const currentBrand = useMemo(() => data?.brands.find((brand) => brand.id === data.currentBrandId) ?? null, [data]);
  return { currentBrand, currentBrandId: data?.currentBrandId ?? null, brands: data?.brands ?? [], isLoading, error, reload };
}

export function useSetCurrentBrand() {
  return useCallback(async (brandId: string) => {
    const response = await fetch("/api/brand/current", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ brandId })
    });
    const payload = await response.json();
    if (!response.ok || !payload?.success) {
      throw new Error(payload?.error ?? "Không thể chuyển Brand hiện tại");
    }
    return payload.data as { currentBrandId: string };
  }, []);
}
