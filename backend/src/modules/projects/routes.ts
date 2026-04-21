import type { FastifyInstance } from "fastify";
import type { AuthedRequest } from "../../types/authed-request.js";
import { requireAuth } from "../auth/preHandler.js";

export async function registerProjectRoutes(app: FastifyInstance): Promise<void> {
  app.get(
    "/projects",
    { preHandler: requireAuth },
    async (request, reply) => {
      const supabase = (request as AuthedRequest).authSupabase;
      const { data, error } = await supabase
        .from("projects")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) return reply.status(400).send({ error: error.message });
      return reply.send({ projects: data ?? [] });
    },
  );

  app.post<{ Body: { title?: string; idea?: string } }>(
    "/projects",
    { preHandler: requireAuth },
    async (request, reply) => {
      const supabase = (request as AuthedRequest<{ Body: { title?: string; idea?: string } }>)
        .authSupabase;
      const { data: authData } = await supabase.auth.getUser();
      const userId = authData.user?.id;
      if (!userId) return reply.status(401).send({ error: "Unauthorized" });

      const { title = "Untitled", idea = "" } = request.body ?? {};
      const { data, error } = await supabase
        .from("projects")
        .insert({
          user_id: userId,
          title,
          idea,
          status: "draft",
          progress: 0,
        })
        .select("*")
        .single();
      if (error) return reply.status(400).send({ error: error.message });
      return reply.status(201).send({ project: data });
    },
  );

  app.get<{ Params: { id: string } }>(
    "/projects/:id",
    { preHandler: requireAuth },
    async (request, reply) => {
      const supabase = (request as AuthedRequest<{ Params: { id: string } }>).authSupabase;
      const { id } = request.params;
      const { data, error } = await supabase.from("projects").select("*").eq("id", id).maybeSingle();
      if (error) return reply.status(400).send({ error: error.message });
      if (!data) return reply.status(404).send({ error: "Project not found" });
      return reply.send({ project: data });
    },
  );
}
