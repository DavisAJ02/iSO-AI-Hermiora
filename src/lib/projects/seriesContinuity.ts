import type { SupabaseClient } from "@supabase/supabase-js";

type SeriesContext = {
  id: string;
  title: string;
  description: string | null;
  continuity_mode: boolean;
  story_bible: string | null;
  default_creative_controls?: unknown;
};

type SeriesProjectRow = {
  id: string;
  title: string | null;
  idea: string | null;
  created_at: string;
  generations?: {
    step: string | null;
    output?: unknown;
  }[] | null;
};

function extractGenerationText(output: unknown) {
  if (!output) return "";
  if (typeof output === "string") return output.trim();
  if (typeof output !== "object" || Array.isArray(output)) return "";

  const record = output as Record<string, unknown>;
  if (typeof record.primary === "string") return record.primary.trim();
  if (typeof record.voiceover === "string") return record.voiceover.trim();
  if (Array.isArray(record.beats)) {
    return record.beats
      .filter((item): item is string => typeof item === "string" && item.trim().length > 0)
      .join(" ");
  }
  return "";
}

function summarizeEpisode(project: SeriesProjectRow) {
  const hook = project.generations?.find((item) => item.step === "hook");
  const script = project.generations?.find((item) => item.step === "script");
  const hookText = extractGenerationText(hook?.output);
  const scriptText = extractGenerationText(script?.output);
  const parts = [
    project.title?.trim() || null,
    project.idea?.trim() || null,
    hookText || null,
    scriptText ? scriptText.slice(0, 220) : null,
  ].filter(Boolean);

  return parts.join(" | ");
}

export async function loadSeriesContinuityContext(
  admin: SupabaseClient,
  userId: string,
  seriesId: string,
  excludeProjectId?: string,
) {
  const { data: series, error: seriesError } = await admin
    .from("series")
    .select("id,title,description,continuity_mode,story_bible,default_creative_controls")
    .eq("id", seriesId)
    .eq("user_id", userId)
    .maybeSingle();

  if (seriesError) throw seriesError;
  if (!series) return null;

  let query = admin
    .from("projects")
    .select("id,title,idea,created_at,generations(step,output)")
    .eq("user_id", userId)
    .eq("series_id", seriesId)
    .order("created_at", { ascending: true });

  if (excludeProjectId) {
    query = query.neq("id", excludeProjectId);
  }

  const { data: projects, error: projectsError } = await query.limit(12);
  if (projectsError) throw projectsError;

  const episodes = ((projects ?? []) as SeriesProjectRow[])
    .map((project, index) => `Episode ${index + 1}: ${summarizeEpisode(project)}`)
    .filter((line) => line.trim().length > 0);

  return {
    series: series as SeriesContext,
    episodes,
    contextText: [
      `Series title: ${series.title}`,
      series.description ? `Series description: ${series.description}` : null,
      series.continuity_mode ? "Series mode: serialized continuation" : "Series mode: reusable format",
      series.story_bible ? `Story bible: ${series.story_bible}` : null,
      episodes.length > 0 ? `Previous episodes:\n${episodes.join("\n")}` : "Previous episodes: none yet",
    ]
      .filter(Boolean)
      .join("\n\n"),
  };
}
