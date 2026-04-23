export type ProviderHealth = {
  provider: "openai" | "elevenlabs" | "tiktok";
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
  const key = process.env.OPENAI_API_KEY;
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

export async function checkElevenLabsHealth(): Promise<ProviderHealth> {
  const key = process.env.ELEVENLABS_API_KEY;
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
  const clientKey = process.env.TIKTOK_CLIENT_KEY;
  const clientSecret = process.env.TIKTOK_CLIENT_SECRET;
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
  if (process.env.TIKTOK_SANDBOX === "true") {
    return "TikTok sandbox is enabled. Use niche-aware short-form patterns; live trend data is not guaranteed in sandbox.";
  }
  return "No live TikTok trend context configured yet.";
}
