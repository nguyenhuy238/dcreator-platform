"use client";

import type { MouseEvent } from "react";

type HomepageSectionButtonProps = {
  targetId: string;
};

export function HomepageSectionButton({ targetId }: HomepageSectionButtonProps) {
  function handleClick(event: MouseEvent<HTMLAnchorElement>) {
    event.preventDefault();
    document.getElementById(targetId)?.scrollIntoView({
      behavior: "smooth",
      block: "start"
    });
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
