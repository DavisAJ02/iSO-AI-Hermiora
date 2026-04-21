import type { SupabaseClient } from "@supabase/supabase-js";

declare module "fastify" {
  interface FastifyRequest {
    /** Set by `requireAuth` after Bearer validation */
    accessToken: string;
    /** User-scoped Supabase client — set by `requireAuth` */
    supabase: SupabaseClient;
  }
}

export {};
