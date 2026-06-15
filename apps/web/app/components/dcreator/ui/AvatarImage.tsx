"use client";

import { useEffect, useMemo, useState } from "react";
import { resolveImageUrl } from "@/lib/images/resolve-image-url";

type AvatarImageProps = {
  src?: string | null;
  name: string;
  className?: string;
  imageClassName?: string;
  fallbackClassName?: string;
  alt?: string;
};

function getInitials(name: string) {
  return (
    name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part.charAt(0).toUpperCase())
      .join("") || "DC"
  );
}

export function AvatarImage({
  src,
  name,
  className = "flex h-full w-full items-center justify-center overflow-hidden bg-zinc-100",
  imageClassName = "h-full w-full object-cover",
  fallbackClassName = "text-4xl font-black text-zinc-300",
  alt
}: AvatarImageProps) {
  const resolvedSrc = useMemo(() => resolveImageUrl(src, ""), [src]);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    setHasError(false);
  }, [resolvedSrc]);

  return (
    <div className={className}>
      {resolvedSrc && !hasError ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={resolvedSrc}
          alt={alt ?? name}
          className={imageClassName}
          loading="lazy"
          decoding="async"
          onError={() => setHasError(true)}
        />
      ) : (
        <span className={fallbackClassName}>{getInitials(name)}</span>
      )}
    </div>
  );
}
