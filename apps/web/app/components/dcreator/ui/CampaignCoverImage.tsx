"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { CAMPAIGN_IMAGE_FALLBACK, resolveImageUrl } from "@/lib/images/resolve-image-url";

type Props = {
  src?: string | null;
  alt: string;
  className?: string;
  sizes?: string;
  priority?: boolean;
};

export function CampaignCoverImage({ src, alt, className, sizes, priority }: Props) {
  const resolvedSrc = resolveImageUrl(src);
  const [imageSrc, setImageSrc] = useState(resolvedSrc);

  useEffect(() => {
    setImageSrc(resolvedSrc);
  }, [resolvedSrc]);

  return (
    <Image
      src={imageSrc}
      alt={alt}
      fill
      className={className}
      sizes={sizes}
      priority={priority}
      onError={() => setImageSrc(CAMPAIGN_IMAGE_FALLBACK)}
    />
  );
}
