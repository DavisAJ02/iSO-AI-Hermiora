"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useAuth } from "@/context/AuthProvider";
import type {
  BillingPeriod,
  CreativeControls,
  GenerationState,
  MobileOperator,
  PaymentMethod,
  PipelineStepId,
  Project,
  PlanTier,
  Series,
} from "@/lib/types";
import { PIPELINE_STEPS } from "@/lib/constants";
import { getMaishaRequestAuthHeaders } from "@/lib/payments/maishaClientAuth";
import { mapProjectRow, type ProjectRow } from "@/lib/projects/projectMapping";
import { mapSeriesRow, type SeriesRow } from "@/lib/projects/seriesMapping";
import { DEFAULT_CREATIVE_CONTROLS } from "@/lib/projects/creativeControls";

type SocialId = "tiktok" | "instagram" | "youtube";

interface AppContextValue {
  idea: string;
  setIdea: (v: string) => void;
  createIdea: string;
  setCreateIdea: (v: string) => void;
  createSeriesId: string | null;
  setCreateSeriesId: (id: string | null) => void;
  createControls: CreativeControls;
  setCreateControls: (next: Partial<CreativeControls>) => void;
  generation: GenerationState;
  startGeneration: (sourceIdea?: string) => Promise<void>;
  resetGeneration: () => void;
  projects: {
    items: Project[];
    loading: boolean;
    error: string | null;
    refresh: () => Promise<void>;
  };
  series: {
    items: Series[];
    loading: boolean;
    error: string | null;
    refresh: () => Promise<void>;
    create: (input: {
      title: string;
      description?: string | null;
      continuityMode?: boolean;
      storyBible?: string | null;
      defaultCreativeControls?: CreativeControls;
    }) => Promise<Series | null>;
    update: (
      id: string,
      input: {
        title?: string;
        description?: string | null;
        continuityMode?: boolean;
        storyBible?: string | null;
        defaultCreativeControls?: CreativeControls;
      },
    ) => Promise<Series | null>;
    remove: (id: string) => Promise<boolean>;
    applyToCreate: (id: string | null) => void;
  };
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

const generationStatusText: Record<PipelineStepId, string> = {
  hook: "Crafting hook...",
  script: "Writing script...",
  scenes: "Planning scenes...",
  image_prompts: "Preparing image prompts...",
  voice: "Generating voice...",
  captions: "Building captions...",
  render_prep: "Preparing render...",
  render: "Rendering video...",
};

function generationFromProject(project: Project): GenerationState {
  const progress = project.status === "ready" ? 100 : project.thumbProgress ?? 0;
  const currentStep = project.currentStep ?? (project.status === "ready" ? "render" : "hook");
  return {
    projectId: project.id,
    active: project.status === "generating",
    progress,
    currentStep,
    statusText: project.status === "ready" ? "Ready to preview" : generationStatusText[currentStep],
  };
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const { status, user } = useAuth();

  const [idea, setIdea] = useState("");
  const [createIdea, setCreateIdea] = useState("");
  const [createSeriesId, setCreateSeriesId] = useState<string | null>(null);
  const [createControls, setCreateControlsState] =
    useState<CreativeControls>(DEFAULT_CREATIVE_CONTROLS);
  const [generation, setGeneration] = useState<GenerationState>(initialGeneration);
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectsLoading, setProjectsLoading] = useState(false);
  const [projectsError, setProjectsError] = useState<string | null>(null);
  const [series, setSeries] = useState<Series[]>([]);
  const [seriesLoading, setSeriesLoading] = useState(false);
  const [seriesError, setSeriesError] = useState<string | null>(null);

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

  const refreshProjects = useCallback(async () => {
    if (status !== "authenticated" || !user?.id) {
      setProjects([]);
      setProjectsError(null);
      return;
    }

    setProjectsLoading(true);
    try {
      const authHeaders = await getMaishaRequestAuthHeaders();
      const res = await fetch("/api/projects", {
        credentials: "same-origin",
        headers: authHeaders,
        cache: "no-store",
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        setProjectsError(data.error ?? "Projects could not be loaded.");
        return;
      }
      const data = (await res.json()) as { projects?: ProjectRow[] };
      const mappedProjects = (data.projects ?? []).map(mapProjectRow);
      setProjects(mappedProjects);
      const activeProject = mappedProjects.find((project) => project.status === "generating");
      if (activeProject) {
        setGeneration(generationFromProject(activeProject));
      } else {
        setGeneration((current) => {
          if (!current.active) return current;
          const completedProject = mappedProjects.find(
            (project) => project.id === current.projectId && project.status === "ready",
          );
          return completedProject ? generationFromProject(completedProject) : current;
        });
      }
      setProjectsError(null);
    } finally {
      setProjectsLoading(false);
    }
  }, [status, user?.id]);

  const refreshSeries = useCallback(async () => {
    if (status !== "authenticated" || !user?.id) {
      setSeries([]);
      setSeriesError(null);
      return;
    }

    setSeriesLoading(true);
    try {
      const authHeaders = await getMaishaRequestAuthHeaders();
      const res = await fetch("/api/series", {
        credentials: "same-origin",
        headers: authHeaders,
        cache: "no-store",
      });

      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        setSeriesError(data.error ?? "Series could not be loaded.");
        return;
      }

      const data = (await res.json()) as { series?: SeriesRow[] };
      setSeries((data.series ?? []).map((row) => mapSeriesRow(row)));
      setSeriesError(null);
    } finally {
      setSeriesLoading(false);
    }
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
      void refreshProjects();
      void refreshSeries();
    }, 0);
    return () => window.clearTimeout(id);
  }, [loadPlanFromProfile, refreshProjects, refreshSeries]);

  useEffect(() => {
    const id = window.setTimeout(() => {
      void loadPlanFromPaymentReturn();
    }, 0);
    return () => window.clearTimeout(id);
  }, [loadPlanFromPaymentReturn]);

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === "visible") {
        void loadPlanFromProfile();
        void refreshProjects();
        void refreshSeries();
      }
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onVisible);
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onVisible);
    };
  }, [loadPlanFromProfile, refreshProjects, refreshSeries]);

  useEffect(() => {
    if (!projects.some((project) => project.status === "generating")) return;
    const id = window.setInterval(() => {
      void refreshProjects();
    }, 2500);
    return () => window.clearInterval(id);
  }, [projects, refreshProjects]);

  const resetGeneration = useCallback(() => {
    setGeneration(initialGeneration);
  }, []);

  const setCreateControls = useCallback((next: Partial<CreativeControls>) => {
    setCreateControlsState((current) => ({ ...current, ...next }));
  }, []);

  const createSeriesItem = useCallback(
    async (input: {
      title: string;
      description?: string | null;
      continuityMode?: boolean;
      storyBible?: string | null;
      defaultCreativeControls?: CreativeControls;
    }) => {
      const authHeaders = await getMaishaRequestAuthHeaders();
      const res = await fetch("/api/series", {
        method: "POST",
        credentials: "same-origin",
        headers: {
          "Content-Type": "application/json",
          ...authHeaders,
        },
        body: JSON.stringify(input),
      });

      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        setSeriesError(data.error ?? "Series could not be created.");
        return null;
      }

      const data = (await res.json()) as { series?: SeriesRow };
      if (!data.series) return null;
      const createdSeries = mapSeriesRow(data.series);
      setSeries((current) => [createdSeries, ...current]);
      setSeriesError(null);
      return createdSeries;
    },
    [],
  );

  const updateSeriesItem = useCallback(
    async (
      id: string,
      input: {
        title?: string;
        description?: string | null;
        continuityMode?: boolean;
        storyBible?: string | null;
        defaultCreativeControls?: CreativeControls;
      },
    ) => {
      const authHeaders = await getMaishaRequestAuthHeaders();
      const res = await fetch(`/api/series/${encodeURIComponent(id)}`, {
        method: "PATCH",
        credentials: "same-origin",
        headers: {
          "Content-Type": "application/json",
          ...authHeaders,
        },
        body: JSON.stringify(input),
      });

      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        setSeriesError(data.error ?? "Series could not be updated.");
        return null;
      }

      const data = (await res.json()) as { series?: SeriesRow };
      if (!data.series) return null;
      const updatedSeries = mapSeriesRow(data.series);
      setSeries((current) =>
        current.map((item) => (item.id === id ? { ...item, ...updatedSeries } : item)),
      );
      setProjects((current) =>
        current.map((project) =>
          project.seriesId === id
            ? { ...project, seriesTitle: updatedSeries.title }
            : project,
        ),
      );
      setSeriesError(null);
      return updatedSeries;
    },
    [],
  );

  const removeSeriesItem = useCallback(async (id: string) => {
    const authHeaders = await getMaishaRequestAuthHeaders();
    const res = await fetch(`/api/series/${encodeURIComponent(id)}`, {
      method: "DELETE",
      credentials: "same-origin",
      headers: authHeaders,
    });

    if (!res.ok) {
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      setSeriesError(data.error ?? "Series could not be deleted.");
      return false;
    }

    setSeries((current) => current.filter((item) => item.id !== id));
    setProjects((current) =>
      current.map((project) =>
        project.seriesId === id
          ? { ...project, seriesId: null, seriesTitle: null }
          : project,
      ),
    );
    setSeriesError(null);
    if (createSeriesId === id) {
      setCreateSeriesId(null);
    }
    return true;
  }, [createSeriesId]);

  const applySeriesToCreate = useCallback(
    (id: string | null) => {
      if (!id) {
        setCreateSeriesId(null);
        setCreateControlsState(DEFAULT_CREATIVE_CONTROLS);
        return;
      }

      const selected = series.find((item) => item.id === id);
      if (!selected) return;
      setCreateSeriesId(id);
      setCreateControlsState(selected.defaultCreativeControls);
      setCreateOpen(true);
    },
    [series],
  );

  const seriesWithMetrics = useMemo(
    () =>
      series.map((item) => {
        const related = projects.filter((project) => project.seriesId === item.id);
        return {
          ...item,
          projectCount: related.length,
          readyCount: related.filter((project) => project.status === "ready").length,
          generatingCount: related.filter((project) => project.status === "generating").length,
        };
      }),
    [projects, series],
  );

  const startGeneration = useCallback(
    async (sourceIdea?: string) => {
      const text = (sourceIdea ?? idea).trim();
      if (!text) return;
      setIdea(text);
      setGeneration({
        active: true,
        progress: 6,
        currentStep: "hook",
        statusText: generationStatusText.hook,
      });

      try {
        const authHeaders = await getMaishaRequestAuthHeaders();
        const res = await fetch("/api/projects", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...authHeaders,
          },
          credentials: "same-origin",
          body: JSON.stringify({
            idea: text,
            creativeControls: createControls,
            seriesId: createSeriesId,
          }),
        });

        if (!res.ok) {
          const data = (await res.json().catch(() => ({}))) as { error?: string };
          setGeneration({
            active: false,
            progress: 1,
            currentStep: "hook",
            statusText: data.error ?? "Project could not be created",
          });
          return;
        }

        const data = (await res.json()) as { project?: ProjectRow };
        if (data.project) {
          const createdProject = mapProjectRow(data.project);
          setProjects((current) => [createdProject, ...current]);
          setGeneration(generationFromProject(createdProject));
          window.setTimeout(() => {
            void refreshProjects();
          }, 1400);
        }
        void loadPlanFromProfile();
      } catch {
        setGeneration({
          active: false,
          progress: 1,
          currentStep: "hook",
          statusText: "Network error. Try again.",
        });
        return;
      }
    },
    [createControls, createSeriesId, idea, loadPlanFromProfile, refreshProjects],
  );
  const toggleSocial = useCallback((id: SocialId) => {
    setSocial((s) => ({ ...s, [id]: !s[id] }));
  }, []);

  const value = useMemo<AppContextValue>(
    () => ({
      idea,
      setIdea,
      createIdea,
      setCreateIdea,
      createSeriesId,
      setCreateSeriesId,
      createControls,
      setCreateControls,
      generation,
      startGeneration,
      resetGeneration,
      projects: {
        items: projects,
        loading: projectsLoading,
        error: projectsError,
        refresh: refreshProjects,
      },
      series: {
        items: seriesWithMetrics,
        loading: seriesLoading,
        error: seriesError,
        refresh: refreshSeries,
        create: createSeriesItem,
        update: updateSeriesItem,
        remove: removeSeriesItem,
        applyToCreate: applySeriesToCreate,
      },
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
      createSeriesId,
      createControls,
      generation,
      startGeneration,
      resetGeneration,
      projects,
      projectsLoading,
      projectsError,
      refreshProjects,
      seriesWithMetrics,
      seriesLoading,
      seriesError,
      refreshSeries,
      createSeriesItem,
      updateSeriesItem,
      removeSeriesItem,
      applySeriesToCreate,
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
      setCreateControls,
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
