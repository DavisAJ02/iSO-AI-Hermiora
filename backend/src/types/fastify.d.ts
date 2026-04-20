import type { SupabaseClient } from "@supabase/supabase-js";

declare module "fastify" {
  interface FastifyRequest {
    accessToken?: string;
    supabase?: SupabaseClient;
  }
}
