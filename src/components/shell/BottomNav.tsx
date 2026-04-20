"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpen, Clapperboard, Home, UserRound } from "lucide-react";
import { cn } from "@/lib/utils";

const items = [
  { href: "/", label: "Home", icon: Home },
  { href: "/projects", label: "Projects", icon: Clapperboard },
  { href: "/library", label: "Library", icon: BookOpen },
  { href: "/profile", label: "Profile", icon: UserRound },
] as const;

export function BottomNav() {
  const pathname = usePathname();
  return (
    <nav
      className="pointer-events-none fixed bottom-0 left-0 right-0 z-40 flex justify-center px-3 pb-[calc(0.35rem+env(safe-area-inset-bottom))] pt-2"
      aria-label="Primary"
    >
      <div
        className={cn(
          "pointer-events-auto flex w-full max-w-md items-stretch justify-between gap-1 rounded-[2rem] border border-white/70 bg-white/75 px-1.5 py-1.5 shadow-[0_12px_40px_rgba(15,23,42,0.12)] backdrop-blur-xl backdrop-saturate-150",
          "supports-[backdrop-filter]:bg-white/65",
        )}
      >
        {items.map(({ href, label, icon: Icon }) => {
          const active =
            href === "/"
              ? pathname === "/"
              : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-2xl py-1.5 text-[10px] font-semibold transition md:text-[11px]",
                active
                  ? "text-violet-700"
                  : "text-slate-500 hover:text-slate-800",
              )}
            >
              <span
                className={cn(
                  "flex h-10 w-10 items-center justify-center rounded-2xl transition",
                  active
                    ? "bg-violet-100/90 text-violet-700 shadow-inner shadow-violet-500/10 ring-1 ring-violet-200/60"
                    : "bg-transparent",
                )}
              >
                <Icon className="h-5 w-5" strokeWidth={active ? 2 : 1.75} />
              </span>
              {label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
