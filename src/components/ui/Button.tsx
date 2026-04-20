import { cn } from "@/lib/utils";
import type { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "secondary" | "ghost" | "outline";

export function Button({
  className,
  variant = "primary",
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  const base =
    "inline-flex items-center justify-center gap-2 rounded-full px-4 py-2.5 text-sm font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-600 disabled:pointer-events-none disabled:opacity-45 active:scale-[0.98]";
  const styles: Record<Variant, string> = {
    primary:
      "hermi-gradient-fill text-white shadow-hermi-glow hover:brightness-105",
    secondary:
      "bg-slate-900 text-white hover:bg-slate-800 shadow-sm shadow-slate-900/10",
    ghost: "bg-transparent text-violet-700 hover:bg-violet-50",
    outline:
      "border border-violet-300 bg-white text-violet-700 hover:border-violet-400 hover:bg-violet-50/60",
  };
  return (
    <button className={cn(base, styles[variant], className)} {...props}>
      {children}
    </button>
  );
}
