import { cn } from "@/lib/utils";
import type { HTMLAttributes } from "react";

export function Card({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-[var(--hermi-radius-lg)] border border-[var(--hermi-border)] bg-[var(--hermi-surface)] p-4 shadow-hermi-card",
        className,
      )}
      {...props}
    />
  );
}
