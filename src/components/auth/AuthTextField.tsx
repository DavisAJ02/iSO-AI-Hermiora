"use client";

import { cn } from "@/lib/utils";
import type { InputHTMLAttributes, ReactNode } from "react";

type AuthTextFieldProps = Omit<InputHTMLAttributes<HTMLInputElement>, "className"> & {
  icon: ReactNode;
  trailing?: ReactNode;
  className?: string;
  inputClassName?: string;
};

export function AuthTextField({
  icon,
  trailing,
  className,
  inputClassName,
  ...props
}: AuthTextFieldProps) {
  return (
    <div
      className={cn(
        "flex min-h-[48px] items-stretch overflow-hidden rounded-[var(--hermi-radius-md)] border border-slate-200/90 bg-[var(--hermi-muted)] shadow-inner shadow-slate-900/5 transition",
        "focus-within:border-violet-400 focus-within:bg-white focus-within:ring-2 focus-within:ring-violet-200/80",
        className,
      )}
    >
      <span className="flex w-11 shrink-0 items-center justify-center text-violet-600/80">
        {icon}
      </span>
      <input
        className={cn(
          "min-w-0 flex-1 border-0 bg-transparent py-3 pr-3 text-sm text-slate-900 outline-none placeholder:text-slate-400",
          trailing ? "pr-1" : "",
          inputClassName,
        )}
        {...props}
      />
      {trailing ? (
        <span className="flex shrink-0 items-center pr-2">{trailing}</span>
      ) : null}
    </div>
  );
}
