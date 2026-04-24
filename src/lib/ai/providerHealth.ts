import { aiConfig } from "@/lib/ai/config";

export type ProviderHealth = {
  provider: "openai" | "replicate" | "runway" | "huggingface" | "pexels" | "elevenlabs" | "tiktok";
  configured: boolean;
  ok: boolean;
  message: string;
};

function ok(provider: ProviderHealth["provider"], configured: boolean, message: string): ProviderHealth {
  return { provider, configured, ok: true, message };
}

function fail(provider: ProviderHealth["provider"], configured: boolean, message: string): ProviderHealth {
  return { provider, configured, ok: false, message };
}

export async function checkOpenAiHealth(): Promise<ProviderHealth> {
  const key = aiConfig.openai.apiKey;
  if (!key) return fail("openai", false, "OPENAI_API_KEY is not configured.");

  const res = await fetch("https://api.openai.com/v1/models", {
    headers: { Authorization: `Bearer ${key}` },
    cache: "no-store",
  });

  if (!res.ok) {
    return fail("openai", true, `OpenAI returned ${res.status}.`);
  }

  return ok("openai", true, "OpenAI API key is valid.");
}

export async function checkReplicateHealth(): Promise<ProviderHealth> {
  const key = aiConfig.replicate.apiToken;
  if (!key) return fail("replicate", false, "REPLICATE_API_TOKEN is not configured.");

  const res = await fetch("https://api.replicate.com/v1/account", {
    headers: { Authorization: `Bearer ${key}` },
    cache: "no-store",
  });

  if (!res.ok) {
    return fail("replicate", true, `Replicate returned ${res.status}.`);
  }

  return ok("replicate", true, "Replicate API token is valid.");
}

export async function checkRunwayHealth(): Promise<ProviderHealth> {
  const key = aiConfig.runway.apiKey;
  if (!key) return fail("runway", false, "RUNWAY_API_KEY is not configured.");

  const res = await fetch("https://api.dev.runwayml.com/v1/tasks", {
    headers: {
      Authorization: `Bearer ${key}`,
      "X-Runway-Version": aiConfig.runway.apiVersion,
    },
    cache: "no-store",
  });

  if (!res.ok && res.status !== 405) {
    return fail("runway", true, `Runway returned ${res.status}.`);
  }

  return ok("runway", true, "Runway API key is configured.");
}

export async function checkHuggingFaceHealth(): Promise<ProviderHealth> {
  const key = aiConfig.huggingface.apiKey;
  if (!key) return fail("huggingface", false, "HUGGINGFACE_API_KEY is not configured.");

  const res = await fetch("https://router.huggingface.co/v1/models", {
    headers: { Authorization: `Bearer ${key}` },
    cache: "no-store",
  });

  if (!res.ok) {
    return fail("huggingface", true, `Hugging Face returned ${res.status}.`);
  }

  return ok("huggingface", true, "Hugging Face API key is valid.");
}

export async function checkPexelsHealth(): Promise<ProviderHealth> {
  const key = aiConfig.pexels.apiKey;
  if (!key) return fail("pexels", false, "PEXELS_API_KEY is not configured.");

  const res = await fetch("https://api.pexels.com/v1/search?query=studio&per_page=1", {
    headers: { Authorization: key },
    cache: "no-store",
  });

  if (!res.ok) {
    return fail("pexels", true, `Pexels returned ${res.status}.`);
  }

  return ok("pexels", true, "Pexels API key is valid.");
}

export async function checkElevenLabsHealth(): Promise<ProviderHealth> {
  const key = process.env.ELEVENLABS_API_KEY?.trim();
  if (!key) return fail("elevenlabs", false, "ELEVENLABS_API_KEY is not configured.");

  const res = await fetch("https://api.elevenlabs.io/v2/voices?page_size=1", {
    headers: { "xi-api-key": key },
    cache: "no-store",
  });

  if (!res.ok) {
    return fail("elevenlabs", true, `ElevenLabs returned ${res.status}.`);
  }

  return ok("elevenlabs", true, "ElevenLabs API key is valid.");
}

export async function getTikTokClientAccessToken() {
  const clientKey = process.env.TIKTOK_CLIENT_KEY?.trim();
  const clientSecret = process.env.TIKTOK_CLIENT_SECRET?.trim();
  if (!clientKey || !clientSecret) {
    return { ok: false, token: "", message: "TikTok client key/secret are not configured." };
  }

  const body = new URLSearchParams({
    client_key: clientKey,
    client_secret: clientSecret,
    grant_type: "client_credentials",
  });
  const res = await fetch("https://open.tiktokapis.com/v2/oauth/token/", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
    cache: "no-store",
  });

  if (!res.ok) {
    return { ok: false, token: "", message: `TikTok returned ${res.status}.` };
  }

  const data = (await res.json()) as { access_token?: string };
  if (!data.access_token) {
    return { ok: false, token: "", message: "TikTok did not return an access token." };
  }

  return { ok: true, token: data.access_token, message: "TikTok client token is valid." };
}

export async function checkTikTokHealth(): Promise<ProviderHealth> {
  const configured = Boolean(process.env.TIKTOK_CLIENT_KEY && process.env.TIKTOK_CLIENT_SECRET);
  const result = await getTikTokClientAccessToken();
  return result.ok
    ? ok("tiktok", configured, result.message)
    : fail("tiktok", configured, result.message);
}

export function getTikTokTrendContext() {
  const manualContext = process.env.TIKTOK_TREND_CONTEXT?.trim();
  if (manualContext) return manualContext;
  if (process.env.TIKTOK_SANDBOX?.trim() === "true") {
    return "TikTok sandbox is enabled. Use niche-aware short-form patterns; live trend data is not guaranteed in sandbox.";
  }
  return "No live TikTok trend context configured yet.";
}
