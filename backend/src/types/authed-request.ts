import type { FastifyRequest } from "fastify/types/request.js";
import type { RouteGenericInterface } from "fastify/types/route.js";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Routes using `requireAuth` — set on `request` after `preHandler`.
 * Names avoid clashing with Fastify/JWT `accessToken?: string` on `FastifyRequest`.
 */
export type AuthedRequest<RouteGeneric extends RouteGenericInterface = RouteGenericInterface> =
  FastifyRequest<RouteGeneric> & {
    authAccessToken: string;
    authSupabase: SupabaseClient;
  };
