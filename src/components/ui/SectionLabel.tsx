import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

export function SectionLabel({
  children,
  className,
  icon,
}: {
  children: ReactNode;
  icon?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500",
        className,
      )}
    >
      {icon}
      {children}
    </div>
  );
}
