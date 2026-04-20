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
import type {
  BillingPeriod,
  GenerationState,
  MobileOperator,
  PaymentMethod,
  PipelineStepId,
  PlanTier,
} from "@/lib/types";
import { PIPELINE_STEPS } from "@/lib/constants";

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

export function AppProvider({ children }: { children: React.ReactNode }) {
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
        name: "Jordan Davis",
        handle: "@jordancreates",
        defaultVoice,
        setDefaultVoice,
        videoStyle,
        setVideoStyle,
        autoCaptions,
        setAutoCaptions,
        notifications,
        setNotifications,
      },
      plan: { tier: "free", usedVideos: 3, monthlyVideoCap: 5 },
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
