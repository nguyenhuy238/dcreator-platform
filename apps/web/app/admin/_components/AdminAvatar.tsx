"use client";

import { useEffect, useMemo, useState } from "react";
import { resolveAdminImageSrc } from "@/app/admin/_components/image-resolver";

type AdminAvatarProps = {
  name: string;
  imageUrl?: string | null;
  className?: string;
  alt?: string;
};

export function AdminAvatar({ name, imageUrl, className = "h-10 w-10", alt }: AdminAvatarProps) {
  const [hasError, setHasError] = useState(false);
  const src = useMemo(() => resolveAdminImageSrc(imageUrl), [imageUrl]);
  const initial = (name || "U").charAt(0).toUpperCase();

  useEffect(() => {
    setHasError(false);
  }, [src]);

  if (!src || hasError) {
    return (
      <div className={`flex items-center justify-center rounded-xl bg-zinc-900 text-xs font-bold text-white ${className}`}>
        {initial}
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt || name || "Avatar"}
      className={`rounded-xl border border-zinc-200 object-cover ${className}`}
      onError={() => setHasError(true)}
    />
  );
}

