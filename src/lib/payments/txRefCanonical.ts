/**
 * MaishaPay sometimes concatenates junk onto the reference (e.g. `HERMIORA_abc/?status=…`).
 * Our DB stores only the canonical ref — extract it before lookups and redirects.
 */
export function parseCanonicalTxRef(raw: string): string | null {
  const s = raw.trim();
  if (!s) return null;
  const m = s.match(/\b(HERMIORA_[0-9a-fA-F]{32}|hm_[0-9a-fA-F]{32})\b/);
  return m?.[1] ?? null;
}
