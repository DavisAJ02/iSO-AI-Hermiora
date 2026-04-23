import { DEFAULT_CREATIVE_CONTROLS, normalizeCreativeControls } from "@/lib/projects/creativeControls";
import type { Series } from "@/lib/types";

export type SeriesRow = {
  id: string;
  title: string | null;
  description?: string | null;
  default_creative_controls?: unknown;
  created_at?: string | null;
};

export function mapSeriesRow(
  row: SeriesRow,
  projectMetrics?: {
    projectCount: number;
    readyCount: number;
    generatingCount: number;
  },
): Series {
  return {
    id: row.id,
    title: row.title?.trim() || "Untitled series",
    description: row.description?.trim() || null,
    defaultCreativeControls: normalizeCreativeControls(
      row.default_creative_controls,
      DEFAULT_CREATIVE_CONTROLS,
    ),
    projectCount: projectMetrics?.projectCount ?? 0,
    readyCount: projectMetrics?.readyCount ?? 0,
    generatingCount: projectMetrics?.generatingCount ?? 0,
    createdAt: row.created_at ?? undefined,
  };
}
