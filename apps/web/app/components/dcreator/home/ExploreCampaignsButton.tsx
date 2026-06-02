"use client";

import type { MouseEvent } from "react";

export const FEATURED_CAMPAIGNS_RESET_EVENT = "dcreator:show-all-featured-campaigns";

export function ExploreCampaignsButton() {
  function handleClick(event: MouseEvent<HTMLAnchorElement>) {
    event.preventDefault();
    window.dispatchEvent(new Event(FEATURED_CAMPAIGNS_RESET_EVENT));
    document.getElementById("featured-campaigns")?.scrollIntoView({
      behavior: "smooth",
      block: "start"
    });
  }

  return (
    <a
      href="#featured-campaigns"
      onClick={handleClick}
      className="dc-btn-primary h-10 min-w-[190px] rounded-full px-6 text-base font-bold tracking-[0.02em]"
    >
      Khám phá chiến dịch
    </a>
  );
}
