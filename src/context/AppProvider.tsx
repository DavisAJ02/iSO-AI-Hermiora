"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useAuth } from "@/context/AuthProvider";
import type {
  BillingPeriod,
  GenerationState,
  MobileOperator,
  PaymentMethod,
  PipelineStepId,
  PlanTier,
} from "@/lib/types";
import { PIPELINE_STEPS } from "@/lib/constants";
import { getMaishaRequestAuthHeaders } from "@/lib/payments/maishaClientAuth";

type SocialId = "tiktok" | "instagram" | "youtube";

interface AppContextValue {
  idea: string;
  setIdea: (v: string) => void;
  createIdea: string;
  setCreateIdea: (v: string) => void;
  generation: GenerationState;
  startGeneration: (sourceIdea?: string) => void;
  resetGeneration: () => void;
  profile: {
    name: string;
    handle: string;
    defaultVoice: string;
    setDefaultVoice: (v: string) => void;
    videoStyle: string;
    setVideoStyle: (v: string) => void;
    autoCaptions: boolean;
    setAutoCaptions: (v: boolean) => void;
    notifications: boolean;
    setNotifications: (v: boolean) => void;
  };
  plan: { tier: PlanTier; usedVideos: number; monthlyVideoCap: number };
  billing: { period: BillingPeriod; setPeriod: (p: BillingPeriod) => void };
  checkout: {
    selectedTier: PlanTier;
    setSelectedTier: (t: PlanTier) => void;
    paymentMethod: PaymentMethod;
    setPaymentMethod: (m: PaymentMethod) => void;
    operator: MobileOperator;
    setOperator: (o: MobileOperator) => void;
    phone: string;
    setPhone: (p: string) => void;
    payerName: string;
    setPayerName: (n: string) => void;
    email: string;
    setEmail: (e: string) => void;
  };
  social: Record<SocialId, boolean>;
  toggleSocial: (id: SocialId) => void;
  ui: {
    createOpen: boolean;
    openCreate: () => void;
    closeCreate: () => void;
    goProOpen: boolean;
    openGoPro: () => void;
    closeGoPro: () => void;
    checkoutOpen: boolean;
    openCheckout: (tier?: PlanTier) => void;
    closeCheckout: () => void;
    voiceMenuOpen: boolean;
    setVoiceMenuOpen: (v: boolean) => void;
    styleMenuOpen: boolean;
    setStyleMenuOpen: (v: boolean) => void;
  };
}

const AppContext = createContext<AppContextValue | null>(null);

const initialGeneration: GenerationState = {
  active: false,
  progress: 0,
  currentStep: "hook",
  statusText: "Queued…",
};

function stepIndex(id: PipelineStepId) {
  return PIPELINE_STEPS.findIndex((s) => s.id === id);
}

function normalizePlanTier(raw: string | null | undefined): PlanTier {
  const p = (raw ?? "").trim().toLowerCase();
  if (p === "creator" || p === "pro") return p;
  return "free";
}

function defaultCapForPlan(tier: PlanTier): number {
  if (tier === "pro") return 200;
  if (tier === "creator") return 50;
  return 5;
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const { status, user } = useAuth();

  const [idea, setIdea] = useState("");
  const [createIdea, setCreateIdea] = useState("");
  const [generation, setGeneration] = useState<GenerationState>(initialGeneration);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [defaultVoice, setDefaultVoice] = useState("Dramatic Male");
  const [videoStyle, setVideoStyle] = useState("Cinematic");
  const [autoCaptions, setAutoCaptions] = useState(true);
  const [notifications, setNotifications] = useState(true);

  const [period, setPeriod] = useState<BillingPeriod>("yearly");
  const [selectedTier, setSelectedTier] = useState<PlanTier>("pro");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("apple");
  const [operator, setOperator] = useState<MobileOperator>("mpesa");
  const [phone, setPhone] = useState("");
  const [payerName, setPayerName] = useState("");
  const [email, setEmail] = useState("");

  const [social, setSocial] = useState<Record<SocialId, boolean>>({
    tiktok: true,
    instagram: false,
    youtube: false,
  });

  const [createOpen, setCreateOpen] = useState(false);
  const [goProOpen, setGoProOpen] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [voiceMenuOpen, setVoiceMenuOpen] = useState(false);
  const [styleMenuOpen, setStyleMenuOpen] = useState(false);

  const [plan, setPlan] = useState<{
    tier: PlanTier;
    usedVideos: number;
    monthlyVideoCap: number;
  }>({ tier: "free", usedVideos: 0, monthlyVideoCap: 5 });

  /** Display name from Supabase `profiles.name` — no placeholder identity */
  const [savedProfileName, setSavedProfileName] = useState("");

  const loadPlanFromProfile = useCallback(async () => {
    if (status !== "authenticated" || !user?.id) {
      setPlan({ tier: "free", usedVideos: 0, monthlyVideoCap: 5 });
      setSavedProfileName("");
      return;
    }

    const authHeaders = await getMaishaRequestAuthHeaders();
    const res = await fetch("/api/me", {
      credentials: "same-origin",
      headers: authHeaders,
      cache: "no-store",
    });

    if (!res.ok) {
      return;
    }

    const data = (await res.json()) as {
      profile?: {
        name?: string | null;
        plan?: string | null;
        monthly_usage_count?: number | null;
        usage_limit?: number | null;
      } | null;
      subscription?: {
        plan?: string | null;
        status?: string | null;
        expires_at?: string | null;
      } | null;
    };

    const n = data.profile?.name;
    setSavedProfileName(typeof n === "string" ? n.trim() : "");

    const activeSubscription =
      data.subscription?.status === "active" &&
      (!data.subscription.expires_at ||
        new Date(data.subscription.expires_at).getTime() > Date.now());
    const tier = normalizePlanTier(
      activeSubscription ? data.subscription?.plan : data.profile?.plan,
    );
    const savedCap = Number(data.profile?.usage_limit ?? 0);

    setPlan({
      tier,
      usedVideos: Number(data.profile?.monthly_usage_count ?? 0),
      monthlyVideoCap: savedCap > 0 ? savedCap : defaultCapForPlan(tier),
    });
  }, [status, user?.id]);

  const loadPlanFromPaymentReturn = useCallback(async () => {
    const url = new URL(window.location.href);
    const isBillingReturn = url.searchParams.get("billing") === "success";
    const txRef =
      url.searchParams.get("txRef")?.trim() ||
      url.searchParams.get("ref")?.trim() ||
      "";

    if (!isBillingReturn || !txRef) return;

    try {
      const authHeaders = await getMaishaRequestAuthHeaders();
      const res = await fetch(
        `/api/payments/status?txRef=${encodeURIComponent(txRef)}`,
        {
          credentials: "same-origin",
          headers: authHeaders,
          cache: "no-store",
        },
      );
      if (!res.ok) return;
      const data = (await res.json()) as {
        status?: string | null;
        plan?: string | null;
      };
      if (data.status !== "success") return;

      const tier = normalizePlanTier(data.plan);
      if (tier === "free") return;
      setPlan((current) => ({
        tier,
        usedVideos: current.usedVideos,
        monthlyVideoCap: defaultCapForPlan(tier),
      }));
    } finally {
      url.searchParams.delete("billing");
      url.searchParams.delete("txRef");
      url.searchParams.delete("ref");
      url.searchParams.delete("ts");
      window.history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
    }
  }, []);

  useEffect(() => {
    const id = window.setTimeout(() => {
      void loadPlanFromProfile();
    }, 0);
    return () => window.clearTimeout(id);
  }, [loadPlanFromProfile]);

  useEffect(() => {
    const id = window.setTimeout(() => {
      void loadPlanFromPaymentReturn();
    }, 0);
    return () => window.clearTimeout(id);
  }, [loadPlanFromPaymentReturn]);

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === "visible") void loadPlanFromProfile();
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onVisible);
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onVisible);
    };
  }, [loadPlanFromProfile]);

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const resetGeneration = useCallback(() => {
    clearTimer();
    setGeneration(initialGeneration);
  }, [clearTimer]);

  const startGeneration = useCallback(
    (sourceIdea?: string) => {
      const text = (sourceIdea ?? idea).trim();
      if (!text) return;
      setIdea(text);
      clearTimer();

      const labels: Record<PipelineStepId, string> = {
        hook: "Crafting hook…",
        script: "Writing script…",
        scenes: "Planning scenes…",
        voice: "Generating voice…",
        rendering: "Rendering video…",
      };

      setGeneration({
        active: true,
        progress: 6,
        currentStep: "hook",
        statusText: labels.hook,
      });

      timerRef.current = setInterval(() => {
        setGeneration((g) => {
          if (!g.active) {
            clearTimer();
            return g;
          }
          const next = Math.min(100, g.progress + 7);
          const order = PIPELINE_STEPS.map((s) => s.id);
          const idx = Math.min(
            order.length - 1,
            Math.floor((next / 100) * order.length * 0.98),
          );
          const currentStep = order[idx];
          if (next >= 100) {
            clearTimer();
            return {
              active: false,
              progress: 100,
              currentStep: "rendering",
              statusText: "Ready to preview",
            };
          }
          return {
            active: true,
            progress: next,
            currentStep,
            statusText: labels[currentStep],
          };
        });
      }, 420);
    },
    [clearTimer, idea],
  );

  useEffect(() => () => clearTimer(), [clearTimer]);

  const toggleSocial = useCallback((id: SocialId) => {
    setSocial((s) => ({ ...s, [id]: !s[id] }));
  }, []);

  const value = useMemo<AppContextValue>(
    () => ({
      idea,
      setIdea,
      createIdea,
      setCreateIdea,
      generation,
      startGeneration,
      resetGeneration,
      profile: {
        name: savedProfileName,
        handle: "",
        defaultVoice,
        setDefaultVoice,
        videoStyle,
        setVideoStyle,
        autoCaptions,
        setAutoCaptions,
        notifications,
        setNotifications,
      },
      plan,
      billing: { period, setPeriod },
      checkout: {
        selectedTier,
        setSelectedTier,
        paymentMethod,
        setPaymentMethod,
        operator,
        setOperator,
        phone,
        setPhone,
        payerName,
        setPayerName,
        email,
        setEmail,
      },
      social,
      toggleSocial,
      ui: {
        createOpen,
        openCreate: () => setCreateOpen(true),
        closeCreate: () => setCreateOpen(false),
        goProOpen,
        openGoPro: () => setGoProOpen(true),
        closeGoPro: () => setGoProOpen(false),
        checkoutOpen,
        openCheckout: (tier) => {
          if (tier) setSelectedTier(tier);
          setCheckoutOpen(true);
        },
        closeCheckout: () => setCheckoutOpen(false),
        voiceMenuOpen,
        setVoiceMenuOpen,
        styleMenuOpen,
        setStyleMenuOpen,
      },
    }),
    [
      idea,
      createIdea,
      generation,
      startGeneration,
      resetGeneration,
      defaultVoice,
      videoStyle,
      autoCaptions,
      notifications,
      savedProfileName,
      plan,
      period,
      selectedTier,
      paymentMethod,
      operator,
      phone,
      payerName,
      email,
      social,
      toggleSocial,
      createOpen,
      goProOpen,
      checkoutOpen,
      voiceMenuOpen,
      styleMenuOpen,
    ],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}

export function usePipelineStepState(current: PipelineStepId) {
  return useMemo(() => {
    const idx = stepIndex(current);
    return PIPELINE_STEPS.map((step, i) => ({
      ...step,
      done: i < idx,
      active: i === idx,
    }));
  }, [current]);
}
