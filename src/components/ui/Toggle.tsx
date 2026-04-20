"use client";

import { cn } from "@/lib/utils";

export function Toggle({
  checked,
  onChange,
  id,
  disabled,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  id?: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      id={id}
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative h-7 w-12 shrink-0 rounded-full border transition",
        checked
          ? "border-violet-500 bg-violet-600 shadow-sm"
          : "border-slate-200 bg-white",
        disabled && "opacity-45",
      )}
    >
      <span
        className={cn(
          "pointer-events-none absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition translate-x-0",
          checked && "translate-x-5",
        )}
      />
    </button>
  );
}
