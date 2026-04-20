"use client";

import { AlertTriangle } from "lucide-react";

export function AuthErrorBanner({ message }: { message: string }) {
  return (
    <div className="hermi-auth-error-banner" role="alert">
      <AlertTriangle
        className="mt-0.5 h-4 w-4 shrink-0 text-[#f87171]"
        strokeWidth={2}
        aria-hidden
      />
      <span>{message}</span>
    </div>
  );
}
