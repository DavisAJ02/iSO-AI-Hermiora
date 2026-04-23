import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import {
  checkElevenLabsHealth,
  checkOpenAiHealth,
  checkTikTokHealth,
} from "@/lib/ai/providerHealth";
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

export async function GET(req: Request) {
  const user = await getSignedInUser(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const results = await Promise.allSettled([
    checkOpenAiHealth(),
    checkElevenLabsHealth(),
    checkTikTokHealth(),
  ]);

  return NextResponse.json({
    providers: results.map((result, index) => {
      if (result.status === "fulfilled") return result.value;
      const provider = ["openai", "elevenlabs", "tiktok"][index];
      return {
        provider,
        configured: false,
        ok: false,
        message: result.reason instanceof Error ? result.reason.message : "Health check failed.",
      };
    }),
  });
}
