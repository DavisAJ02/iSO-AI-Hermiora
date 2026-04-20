/** Prevent open redirects from `next` query (must stay on this origin). */
export function safeNextPath(next: string | null | undefined): string {
  if (!next || typeof next !== "string") return "/";
  const t = next.trim();
  if (!t.startsWith("/") || t.startsWith("//")) return "/";
  if (t.includes("://")) return "/";
  return t;
}
