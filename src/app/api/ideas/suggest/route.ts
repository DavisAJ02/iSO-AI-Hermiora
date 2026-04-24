import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { runAiJob } from "@/lib/ai/aiRouter";
import { aiConfig } from "@/lib/ai/config";
import { getTikTokTrendContext } from "@/lib/ai/providerHealth";
import { DEFAULT_CREATIVE_CONTROLS, normalizeCreativeControls } from "@/lib/projects/creativeControls";
import { loadSeriesContinuityContext } from "@/lib/projects/seriesContinuity";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { createClient } from "@/utils/supabase/server";

export const runtime = "nodejs";

function getAuthHeader(req: Request): string | null {
  return req.headers.get("Authorization") ?? req.headers.get("authorization");
}

async function getSignedInUser(req: Request) {
  const supabase = createClient(await cookies(), getAuthHeader(req));
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) return null;
  return user;
}

const suggestionSchema = {
  type: "object",
  additionalProperties: false,
  required: ["primaryIdea", "alternatives", "reasoning"],
  properties: {
    primaryIdea: { type: "string" },
    alternatives: {
      type: "array",
      items: { type: "string" },
    },
    reasoning: { type: "string" },
  },
} as const;

export async function POST(req: Request) {
  const user = await getSignedInUser(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: {
    currentIdea?: string;
    seriesId?: string | null;
    creativeControls?: unknown;
  };
  try {
    body = (await req.json()) as {
      currentIdea?: string;
      seriesId?: string | null;
      creativeControls?: unknown;
    };
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!aiConfig.openai.apiKey && !aiConfig.huggingface.apiKey) {
    return NextResponse.json({ error: "No text suggestion provider is configured." }, { status: 500 });
  }

  const currentIdea = body.currentIdea?.trim() || "";
  const seriesId = typeof body.seriesId === "string" ? body.seriesId.trim() : "";
  const controls = normalizeCreativeControls(body.creativeControls, DEFAULT_CREATIVE_CONTROLS);

  const admin = createAdminSupabaseClient();
  const seriesContext = seriesId
    ? await loadSeriesContinuityContext(admin, user.id, seriesId)
    : null;

  const trendContext = getTikTokTrendContext();

  const systemPrompt =
    seriesContext?.series.continuity_mode
      ? "You are Hermiora AI. Suggest the next serialized episode idea so the story clearly continues from previous episodes, introduces one fresh turn, and leaves an open loop for the following episode."
      : "You are Hermiora AI. Suggest the best next short-form video idea based on the creator's creative controls and context.";

  const userPrompt = [
    `Current draft idea: ${currentIdea || "none yet"}`,
    `Creative controls: niche=${controls.niche}, language=${controls.language}, voice=${controls.voiceStyle}, art=${controls.artStyle}, captions=${controls.captionStyle}, music=${controls.backgroundMusic}, effects=${controls.effects.join(", ") || "none"}`,
    controls.exampleScript?.trim() ? `Tone reference: ${controls.exampleScript.trim()}` : null,
    `Trend context: ${trendContext}`,
    seriesContext ? `Series context:\n${seriesContext.contextText}` : null,
    seriesContext?.series.continuity_mode
      ? "Return a continuation that logically follows prior episodes."
      : "Return an idea that feels strong, clickable, and coherent.",
  ]
    .filter(Boolean)
    .join("\n\n");

  try {
    const result = await runAiJob(admin, {
      userId: user.id,
      jobType: "script",
      prompt: userPrompt,
      text: {
        model: aiConfig.openai.model,
        parseJson: true,
        schemaName: "idea_suggestion",
        jsonSchema: suggestionSchema,
        systemPrompt,
      },
      metadata: {
        type: "idea_suggestion",
        seriesId: seriesId || null,
      },
    });

    const suggestion = result.outputJson as {
      primaryIdea: string;
      alternatives: string[];
      reasoning: string;
    } | undefined;

    if (!suggestion?.primaryIdea) {
      return NextResponse.json({ error: "No idea suggestion returned." }, { status: 502 });
    }

    return NextResponse.json({ suggestion });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "AI suggestion failed.",
      },
      { status: 502 },
    );
  }
}
