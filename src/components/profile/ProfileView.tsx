"use client";

import {
  Bell,
  ChevronDown,
  Crown,
  Link2,
  LogOut,
  Settings,
  SlidersHorizontal,
  Volume2,
  Wand2,
  MessageCircle,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useMemo, useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { Toggle } from "@/components/ui/Toggle";
import { useApp } from "@/context/AppProvider";
import { useAuth } from "@/context/AuthProvider";
import { signOut } from "@/lib/auth/authService";
import { VOICE_OPTIONS, VIDEO_STYLE_OPTIONS } from "@/lib/constants";
import { cn } from "@/lib/utils";

export function ProfileView() {
  const router = useRouter();
  const { user } = useAuth();
  const { profile, plan, social, toggleSocial, ui } = useApp();
  const [signingOut, setSigningOut] = useState(false);

  const displayName = useMemo(() => {
    const meta = user?.user_metadata as Record<string, string | undefined> | undefined;
    return (
      meta?.full_name?.trim() ||
      meta?.name?.trim() ||
      user?.email?.split("@")[0] ||
      profile.name
    );
  }, [user, profile.name]);

  const handleLine = useMemo(() => {
    if (user?.email) return user.email;
    return profile.handle;
  }, [user?.email, profile.handle]);

  const initials = useMemo(() => {
    const n = displayName.trim();
    if (!n) return "?";
    const parts = n.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
      return `${parts[0]![0]!}${parts[1]![0]!}`.toUpperCase();
    }
    return n.slice(0, 2).toUpperCase();
  }, [displayName]);

  const onSignOut = useCallback(async () => {
    setSigningOut(true);
    try {
      await signOut();
      router.replace("/auth/sign-in");
      router.refresh();
    } finally {
      setSigningOut(false);
    }
  }, [router]);
  const used = plan.usedVideos;
  const displayCap = plan.monthlyVideoCap;
  const safeCap = Math.max(displayCap, 1);
  const pct = Math.min(100, Math.round((used / safeCap) * 100));
  const planTitle =
    plan.tier === "free" ? "Free Plan" : plan.tier === "creator" ? "Creator Plan" : "Pro Plan";

  return (
    <div className="flex flex-col gap-6 pb-4 pt-2 md:pt-6">
      <header className="flex items-center justify-between gap-2">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          Profile
        </h1>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => void onSignOut()}
            disabled={signingOut}
            className="flex h-10 min-w-[2.5rem] items-center justify-center gap-1 rounded-full border border-slate-200 bg-white px-2.5 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-50"
            aria-label="Sign out"
          >
            <LogOut className="h-4 w-4 shrink-0" aria-hidden />
            <span className="hidden sm:inline">{signingOut ? "…" : "Sign out"}</span>
          </button>
          <button
            type="button"
            className="flex h-10 w-10 items-center justify-center rounded-full border border-violet-200 bg-violet-50 text-violet-700 shadow-sm"
            aria-label="Settings"
          >
            <Settings className="h-5 w-5" />
          </button>
        </div>
      </header>

      <Card className="flex items-center gap-3 p-4">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-violet-600 to-fuchsia-500 text-base font-semibold text-white shadow-md shadow-violet-500/30">
          {initials}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold text-slate-900">{displayName}</p>
          <p className="truncate text-sm text-slate-500">{handleLine}</p>
          <div className="mt-1 inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-900 ring-1 ring-amber-200/80">
            <Crown className="h-3.5 w-3.5" />
            {planTitle}
          </div>
        </div>
        <Button variant="outline" type="button" className="shrink-0 px-3 py-2">
          Edit
        </Button>
      </Card>

      <Card className="space-y-3 p-4">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-sm font-semibold text-slate-900">{planTitle}</p>
            <p className="text-xs text-slate-500">
              {used} of {displayCap} videos used this month
            </p>
          </div>
          <Button type="button" className="px-3 py-2 text-xs" onClick={ui.openGoPro}>
            Upgrade →
          </Button>
        </div>
        <ProgressBar value={pct} />
        <div className="flex justify-between text-[11px] text-slate-500">
          <span>{used} used</span>
          <span>{Math.max(0, displayCap - used)} remaining</span>
        </div>
      </Card>

      <section className="space-y-2">
        <SectionLabel className="text-violet-700" icon={<SlidersHorizontal className="h-3.5 w-3.5" />}>
          Default settings
        </SectionLabel>
        <Card className="divide-y divide-slate-100 p-0">
          <div className="relative flex items-center gap-3 p-4">
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-violet-100 text-violet-700">
              <Volume2 className="h-5 w-5" />
            </span>
            <div className="flex-1">
              <p className="text-sm font-medium text-slate-900">Default Voice</p>
              <button
                type="button"
                onClick={() => ui.setVoiceMenuOpen(!ui.voiceMenuOpen)}
                className="mt-1 inline-flex items-center gap-1 text-sm font-semibold text-violet-700"
              >
                {profile.defaultVoice}
                <ChevronDown className="h-4 w-4" />
              </button>
            </div>
            {ui.voiceMenuOpen && (
              <div className="absolute left-3 right-3 top-[calc(100%-0.5rem)] z-10 rounded-2xl border border-slate-200 bg-white p-2 shadow-lg shadow-slate-900/10">
                {VOICE_OPTIONS.map((v) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => {
                      profile.setDefaultVoice(v);
                      ui.setVoiceMenuOpen(false);
                    }}
                    className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm hover:bg-slate-50"
                  >
                    {v}
                    {profile.defaultVoice === v && (
                      <span className="text-violet-600">✓</span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="relative flex items-center gap-3 p-4">
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-violet-100 text-violet-700">
              <Wand2 className="h-5 w-5" />
            </span>
            <div className="flex-1">
              <p className="text-sm font-medium text-slate-900">Video Style</p>
              <button
                type="button"
                onClick={() => ui.setStyleMenuOpen(!ui.styleMenuOpen)}
                className="mt-1 inline-flex items-center gap-1 text-sm font-semibold text-violet-700"
              >
                {profile.videoStyle}
                <ChevronDown className="h-4 w-4" />
              </button>
            </div>
            {ui.styleMenuOpen && (
              <div className="absolute left-3 right-3 top-[calc(100%-0.5rem)] z-10 rounded-2xl border border-slate-200 bg-white p-2 shadow-lg shadow-slate-900/10">
                {VIDEO_STYLE_OPTIONS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => {
                      profile.setVideoStyle(s);
                      ui.setStyleMenuOpen(false);
                    }}
                    className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm hover:bg-slate-50"
                  >
                    {s}
                    {profile.videoStyle === s && (
                      <span className="text-violet-600">✓</span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="flex items-center gap-3 p-4">
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-violet-100 text-violet-700">
              <MessageCircle className="h-5 w-5" />
            </span>
            <div className="flex-1">
              <p className="text-sm font-medium text-slate-900">Auto Captions</p>
              <p className="text-xs text-slate-500">Burn in captions automatically</p>
            </div>
            <Toggle
              checked={profile.autoCaptions}
              onChange={profile.setAutoCaptions}
            />
          </div>

          <div className="flex items-center gap-3 p-4">
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-violet-100 text-violet-700">
              <Bell className="h-5 w-5" />
            </span>
            <div className="flex-1">
              <p className="text-sm font-medium text-slate-900">Notifications</p>
              <p className="text-xs text-slate-500">Render and publishing updates</p>
            </div>
            <Toggle
              checked={profile.notifications}
              onChange={profile.setNotifications}
            />
          </div>
        </Card>
      </section>

      <section className="space-y-2">
        <SectionLabel className="text-violet-700" icon={<Link2 className="h-3.5 w-3.5" />}>
          Connected accounts
        </SectionLabel>
        <Card className="divide-y divide-slate-100 p-0">
          {[
            {
              id: "tiktok" as const,
              name: "TikTok",
              color: "bg-black text-white",
              icon: "♪",
            },
            {
              id: "instagram" as const,
              name: "Instagram",
              color: "bg-gradient-to-br from-amber-400 via-pink-500 to-purple-600 text-white",
              icon: "◎",
            },
            {
              id: "youtube" as const,
              name: "YouTube",
              color: "bg-red-600 text-white",
              icon: "▶",
            },
          ].map((net) => {
            const connected = social[net.id];
            return (
              <div key={net.id} className="flex items-center gap-3 p-4">
                <span
                  className={cn(
                    "flex h-10 w-10 items-center justify-center rounded-2xl text-sm font-bold",
                    net.color,
                  )}
                >
                  {net.icon}
                </span>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-slate-900">{net.name}</p>
                  {connected ? (
                    <p className="text-xs font-medium text-emerald-600">● Connected</p>
                  ) : (
                    <p className="text-xs text-slate-500">Not connected</p>
                  )}
                </div>
                {connected ? (
                  <Badge tone="success" className="normal-case">
                    Live
                  </Badge>
                ) : (
                  <Button
                    variant="outline"
                    type="button"
                    className="px-3 py-2 text-xs"
                    onClick={() => toggleSocial(net.id)}
                  >
                    Connect
                  </Button>
                )}
              </div>
            );
          })}
        </Card>
        <p className="text-center text-[11px] text-slate-400">
          Publishing destinations ship next — connect accounts to prepare your channels.
        </p>
      </section>
    </div>
  );
}
