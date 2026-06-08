"use client";

import type { MouseEvent, ReactNode } from "react";

type BrandProcessScrollLinkProps = {
  children: ReactNode;
  className?: string;
  targetId: string;
};

export function BrandProcessScrollLink({
  children,
  className,
  targetId
}: BrandProcessScrollLinkProps) {
  function handleClick(event: MouseEvent<HTMLAnchorElement>) {
    event.preventDefault();

    const targetElement = document.getElementById(targetId);
    if (!targetElement) {
      return;
    }

    targetElement.scrollIntoView({
      behavior: "smooth",
      block: "start"
    });
  }

  return (
    <a href={`#${targetId}`} onClick={handleClick} className={className}>
      {children}
    </a>
  );
}
