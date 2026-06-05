"use client";

import Link, { type LinkProps } from "next/link";
import type { AnchorHTMLAttributes, ReactNode } from "react";
import { trackEvent, type GtagEventParams } from "@/lib/analytics";
import type { AnalyticsEventName } from "@/lib/analytics-events";

type Props = LinkProps &
  Omit<AnchorHTMLAttributes<HTMLAnchorElement>, keyof LinkProps | "onClick"> & {
    children: ReactNode;
    eventName: AnalyticsEventName;
    eventParams?: GtagEventParams;
    onClick?: AnchorHTMLAttributes<HTMLAnchorElement>["onClick"];
  };

export function AnalyticsLink({ eventName, eventParams, onClick, children, ...props }: Props) {
  return (
    <Link
      {...props}
      onClick={(event) => {
        trackEvent(eventName, eventParams);
        onClick?.(event);
      }}
    >
      {children}
    </Link>
  );
}
