"use client";

import Link from "next/link";
import type { MouseEvent } from "react";

type HomepageSectionButtonProps = {
  targetId: string;
  href?: string;
};

export function HomepageSectionButton({ targetId, href }: HomepageSectionButtonProps) {
  function handleClick(event: MouseEvent<HTMLAnchorElement>) {
    event.preventDefault();
    document.getElementById(targetId)?.scrollIntoView({
      behavior: "smooth",
      block: "start"
    });
  }

  if (href) {
    return (
      <Link href={href} className="dc-btn-primary bg-white text-zinc-900 hover:bg-zinc-100">
        Tìm hiểu thêm
      </Link>
    );
  }

  return (
    <a
      href={`#${targetId}`}
      onClick={handleClick}
      className="dc-btn-primary bg-white text-zinc-900 hover:bg-zinc-100"
    >
      Tìm hiểu thêm
    </a>
  );
}
