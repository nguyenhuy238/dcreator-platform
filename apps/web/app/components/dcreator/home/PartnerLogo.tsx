"use client";

import { useMemo, useState } from "react";

type PartnerLogoProps = {
  brandName: string;
  logoUrl?: string | null;
  className?: string;
};

function resolveLogoSrc(input?: string | null) {
  if (!input) return "";
  const raw = input.trim();
  if (!raw) return "";

  try {
    const parsed = new URL(raw);
    if (parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1") {
      return `${parsed.pathname}${parsed.search}`;
    }
    return raw;
  } catch {
    return raw.startsWith("/") ? raw : "";
  }
}

export function PartnerLogo({ brandName, logoUrl, className = "" }: PartnerLogoProps) {
  const [errored, setErrored] = useState(false);
  const src = useMemo(() => resolveLogoSrc(logoUrl), [logoUrl]);
  const initial = brandName.trim().charAt(0).toUpperCase() || "B";

  if (!src || errored) {
    return (
      <div className={`flex h-full w-full items-center justify-center rounded-2xl bg-zinc-100 text-2xl font-black text-zinc-700 ${className}`}>
        {initial}
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={`Logo ${brandName}`}
      className={`h-full w-full object-contain ${className}`}
      onError={() => setErrored(true)}
    />
  );
}
