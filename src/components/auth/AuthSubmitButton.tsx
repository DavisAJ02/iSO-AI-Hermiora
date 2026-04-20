"use client";

import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ButtonHTMLAttributes, ReactNode } from "react";

export function AuthSubmitButton({
  children,
  busy,
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  busy?: boolean;
  children: ReactNode;
}) {
  const { disabled, type = "submit", ...rest } = props;
  return (
    <button
      type={type}
      disabled={disabled || busy}
      className={cn("hermi-auth-cta", className)}
      {...rest}
    >
      {busy ? <Loader2 className="h-5 w-5 shrink-0 animate-spin" aria-hidden /> : null}
      {children}
    </button>
  );
}
