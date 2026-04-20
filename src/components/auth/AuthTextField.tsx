"use client";

import { cn } from "@/lib/utils";
import type { InputHTMLAttributes, ReactNode } from "react";

type AuthTextFieldProps = Omit<InputHTMLAttributes<HTMLInputElement>, "className"> & {
  icon: ReactNode;
  trailing?: ReactNode;
  className?: string;
  inputClassName?: string;
  /** Red glow border (e.g. password mismatch on sign-up). */
  invalid?: boolean;
};

export function AuthTextField({
  icon,
  trailing,
  className,
  inputClassName,
  invalid,
  ...props
}: AuthTextFieldProps) {
  return (
    <div
      className={cn("hermi-auth-field", invalid && "hermi-auth-field--invalid", className)}
    >
      <span className="hermi-auth-field-icon">{icon}</span>
      <input className={cn("hermi-auth-field-input", inputClassName)} {...props} />
      {trailing ? (
        <span className="flex shrink-0 items-center pr-2">{trailing}</span>
      ) : null}
    </div>
  );
}
