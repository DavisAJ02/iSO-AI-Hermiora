/**
 * MaishaPay configuration — reads only from environment variables (never hardcode secrets).
 */

export type MaishaGatewayConfig = {
  /** MaishaPay hosted checkout POST target */
  checkoutUrl: string;
  /** From MAISHA_GATEWAY_MODE */
  gatewayMode: string;
  /** From MAISHA_PUBLIC_KEY */
  publicApiKey: string;
  /** From MAISHA_SECRET_KEY — server-side only */
  secretApiKey: string;
};

export function getAppBaseUrl(): string {
  // APP_BASE_URL: canonical site URL for callbacks and launch links (server)
  const raw = process.env.APP_BASE_URL?.trim() || process.env.NEXT_PUBLIC_APP_BASE_URL?.trim();
  if (raw) return raw.replace(/\/$/, "");
  const vercel = process.env.VERCEL_URL?.trim();
  if (vercel) return `https://${vercel.replace(/\/$/, "")}`;
  throw new Error("Set APP_BASE_URL (or NEXT_PUBLIC_APP_BASE_URL) for MaishaPay callbacks.");
}

export function getMaishaGatewayConfig(): MaishaGatewayConfig {
  // Same checkout URL for sandbox and live; mode + keys must match (see MaishaPay Checkout docs).
  const checkoutUrl =
    process.env.MAISHA_BASE_URL?.trim() ||
    "https://marchand.maishapay.online/payment/vers1.0/merchant/checkout";
  // MAISHA_GATEWAY_MODE: "0" = sandbox, "1" = live (sent as `gatewayMode` to MaishaPay).
  const gatewayMode = process.env.MAISHA_GATEWAY_MODE?.trim();
  const publicApiKey = process.env.MAISHA_PUBLIC_KEY?.trim();
  const secretApiKey = process.env.MAISHA_SECRET_KEY?.trim();
  if (!gatewayMode) throw new Error("MAISHA_GATEWAY_MODE is not set");
  if (!publicApiKey) throw new Error("MAISHA_PUBLIC_KEY is not set");
  if (!secretApiKey) throw new Error("MAISHA_SECRET_KEY is not set");
  return { checkoutUrl, gatewayMode, publicApiKey, secretApiKey };
}

/** CDF per 1 USD — required when charging in CDF (e.g. 2850). */
export function getCdfPerUsd(): number {
  const raw = process.env.MAISHA_CDF_PER_USD?.trim();
  if (!raw) {
    throw new Error("MAISHA_CDF_PER_USD is required when currency is CDF (CDF amount per 1 USD).");
  }
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) throw new Error("MAISHA_CDF_PER_USD must be a positive number");
  return n;
}
