/**
 * MaishaPay sometimes concatenates junk onto the reference (e.g. `HERMIORA_abc/?status=…`).
 * Our DB stores only the canonical ref — extract it before lookups and redirects.
 */
export function parseCanonicalTxRef(raw: string): string | null {
  const s = raw.trim();
  if (!s) return null;
  /** Match id anywhere (no \\b — avoids odd failures when junk is glued to the ref) */
  const her = s.match(/HERMIORA_[0-9a-fA-F]{32}/);
  if (her) return her[0];
  const hm = s.match(/hm_[0-9a-fA-F]{32}/);
  return hm?.[0] ?? null;
}

/** Strip Maisha-return garbage (`…/?status=200`) then extract canonical ref */
export function normalizeIncomingTxRef(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const direct = parseCanonicalTxRef(trimmed);
  if (direct) return direct;
  const head = trimmed.split(/[/\s?&#]/)[0]?.trim() ?? "";
  return parseCanonicalTxRef(head);
}
