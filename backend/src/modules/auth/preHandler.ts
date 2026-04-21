import type { FastifyReply, FastifyRequest } from "fastify";
import type { AuthedRequest } from "../../types/authed-request.js";
import { createUserSupabaseClient, getUserIdFromJwt } from "../../lib/supabase.js";

export async function requireAuth(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  const auth = request.headers.authorization;
  if (!auth?.startsWith("Bearer ")) {
    await reply.status(401).send({ error: "Missing Authorization: Bearer <token>" });
    return;
  }
  const token = auth.slice(7).trim();
  const uid = await getUserIdFromJwt(token);
  if (!uid) {
    await reply.status(401).send({ error: "Invalid or expired token" });
    return;
  }
  const authed = request as AuthedRequest;
  authed.authAccessToken = token;
  authed.authSupabase = createUserSupabaseClient(token);
}
