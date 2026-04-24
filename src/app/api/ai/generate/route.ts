import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { runAiJob } from "@/lib/ai/aiRouter";
import type { AiJobType } from "@/lib/ai/jobTypes";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { createClient } from "@/utils/supabase/server";

export const runtime = "nodejs";

/**
 * Unified generation endpoint for frontend calls. Internally this goes through
 * the router so provider choice, fallback, and ai_jobs logging stay consistent.
 */

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

export async function POST(req: Request) {
  const user = await getSignedInUser(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: {
    jobType?: AiJobType;
    prompt?: string;
    image?: { aspectRatio?: string; negativePrompt?: string; size?: string };
    video?: { imageUrl?: string | null; durationSeconds?: number; aspectRatio?: string };
  };

  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const jobType = body.jobType;
  const prompt = body.prompt?.trim();
  if (!jobType || !["script", "viral_score", "image", "video"].includes(jobType)) {
    return NextResponse.json({ error: "Unsupported jobType." }, { status: 400 });
  }
  if (!prompt) {
    return NextResponse.json({ error: "Prompt is required." }, { status: 400 });
  }

  try {
    const admin = createAdminSupabaseClient();
    const result = await runAiJob(admin, {
      userId: user.id,
      jobType,
      prompt,
      image: body.image,
      video: body.video,
      text:
        jobType === "viral_score"
          ? {
              parseJson: true,
              schemaName: "viral_score",
              jsonSchema: {
                type: "object",
                additionalProperties: false,
                required: ["score", "verdict", "reasoning"],
                properties: {
                  score: { type: "number" },
                  verdict: { type: "string" },
                  reasoning: { type: "string" },
                },
              },
              systemPrompt:
                "You are a short-form content strategist. Score the prompt for virality from 0 to 100 and explain why.",
            }
          : undefined,
    });

    return NextResponse.json({
      success: true,
      providerUsed: result.providerUsed,
      jobType: result.jobType,
      outputUrl: result.outputUrl,
      outputText: result.outputText,
      outputJson: result.outputJson,
      jobId: result.jobId,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "AI generation failed.",
      },
      { status: 502 },
    );
  }
}
