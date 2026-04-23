import { cookies } from "next/headers";
import { NextResponse } from "next/server";
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

function extractOutputText(response: unknown): string {
  if (
    response &&
    typeof response === "object" &&
    "output_text" in response &&
    typeof response.output_text === "string"
  ) {
    return response.output_text;
  }

  const output = (response as { output?: { content?: { text?: string }[] }[] })?.output;
  return (
    output
      ?.flatMap((item) => item.content ?? [])
      .map((content) => content.text)
      .filter((text): text is string => typeof text === "string")
      .join("\n") ?? ""
  );
}

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

  const key = process.env.OPENAI_API_KEY?.trim();
  if (!key) {
    return NextResponse.json({ error: "OPENAI_API_KEY is not configured." }, { status: 500 });
  }

  const currentIdea = body.currentIdea?.trim() || "";
  const seriesId = typeof body.seriesId === "string" ? body.seriesId.trim() : "";
  const controls = normalizeCreativeControls(body.creativeControls, DEFAULT_CREATIVE_CONTROLS);

  const admin = createAdminSupabaseClient();
  const seriesContext = seriesId
    ? await loadSeriesContinuityContext(admin, user.id, seriesId)
    : null;

  const model = process.env.OPENAI_GENERATION_MODEL?.trim() || "gpt-4.1-mini";
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

  const res = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      input: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      text: {
        format: {
          type: "json_schema",
          name: "idea_suggestion",
          strict: true,
          schema: suggestionSchema,
        },
      },
    }),
    cache: "no-store",
  });

  if (!res.ok) {
    const errorText = await res.text().catch(() => "");
    return NextResponse.json(
      { error: `AI suggestion failed: ${errorText.slice(0, 240)}` },
      { status: 502 },
    );
  }

  const json = await res.json();
  const outputText = extractOutputText(json);
  if (!outputText) {
    return NextResponse.json({ error: "No idea suggestion returned." }, { status: 502 });
  }

  const suggestion = JSON.parse(outputText) as {
    primaryIdea: string;
    alternatives: string[];
    reasoning: string;
  };

  return NextResponse.json({ suggestion });
}
