import type { Metadata } from "next";

export const metadata: Metadata = {
  title: {
    default: "Hermiora AI",
    template: "%s — Hermiora AI",
  },
};

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return <div className="hermi-auth-root min-h-dvh">{children}</div>;
}
