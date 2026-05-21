import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "./utils";

type CardProps = HTMLAttributes<HTMLDivElement> & {
  children: ReactNode;
};

export function Card({ className, children, ...props }: CardProps) {
  return (
    <div
      className={cn("rounded-2xl border border-dc-border bg-white p-4 shadow-card", className)}
      {...props}
    >
      {children}
    </div>
  );
}
