"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

type BrandMembership = { id: string; name: string; role: "OWNER" | "MANAGER" | "STAFF" };
type BrandContextPayload = { currentBrandId: string; brands: BrandMembership[] };

let brandContextSnapshot: BrandContextPayload | null = null;
const brandContextListeners = new Set<(data: BrandContextPayload) => void>();

function publishBrandContext(data: BrandContextPayload) {
  brandContextSnapshot = data;
  brandContextListeners.forEach((listener) => listener(data));
}

export function setCurrentBrandInContext(brandId: string) {
  if (!brandContextSnapshot) return;
  publishBrandContext({ ...brandContextSnapshot, currentBrandId: brandId });
}

export function upsertCurrentBrandInContext(brand: BrandMembership) {
  const current = brandContextSnapshot ?? { currentBrandId: brand.id, brands: [] };
  const brands = current.brands.some((item) => item.id === brand.id)
    ? current.brands.map((item) => (item.id === brand.id ? brand : item))
    : [...current.brands, brand];
  publishBrandContext({ currentBrandId: brand.id, brands });
}

export function useMyBrands() {
  const [data, setData] = useState<BrandContextPayload | null>(brandContextSnapshot);
  const [isLoading, setIsLoading] = useState(!brandContextSnapshot);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/brand/current", { cache: "no-store" });
      const payload = await response.json();
      if (!response.ok || !payload?.success) throw new Error(payload?.error ?? "Không thể tải danh sách Brand");
      publishBrandContext(payload.data as BrandContextPayload);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không thể tải danh sách Brand");
      setData(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const listener = (nextData: BrandContextPayload) => setData(nextData);
    brandContextListeners.add(listener);
    void reload();
    return () => {
      brandContextListeners.delete(listener);
    };
  }, [reload]);

  useEffect(() => {
    if (brandContextSnapshot) setData(brandContextSnapshot);
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
