import { cn } from "@/lib/utils";

export function ProgressBar({
  value,
  className,
  size = "default",
}: {
  value: number;
  className?: string;
  size?: "default" | "hero";
}) {
  const pct = Math.max(0, Math.min(100, value));
  return (
    <div
      className={cn(
        "w-full overflow-hidden rounded-full bg-slate-100",
        size === "hero" ? "h-3 shadow-inner shadow-slate-900/5" : "h-2.5",
        className,
      )}
    >
      <div
        className="hermi-gradient-fill h-full rounded-full transition-[width] duration-500 ease-out"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}
