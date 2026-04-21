import type { FastifyInstance } from "fastify";
import type { AuthedRequest } from "../../types/authed-request.js";
import { requireAuth } from "../auth/preHandler.js";
import { enqueueGeneration } from "../../queue/job.queue.js";

export async function registerGenerationRoutes(app: FastifyInstance): Promise<void> {
  app.post<{ Body: { idea: string; title?: string; projectId?: string } }>(
    "/generate",
    { preHandler: requireAuth },
    async (request, reply) => {
      const r = request as AuthedRequest<{ Body: { idea: string; title?: string; projectId?: string } }>;
      const supabase = r.authSupabase;
      const token = r.authAccessToken;
      const { idea, title = "New video", projectId } = request.body ?? ({} as { idea?: string });

      if (!idea?.trim()) {
        return reply.status(400).send({ error: "idea is required" });
      }

      let pid = projectId;

      const { data: authData } = await supabase.auth.getUser();
      const userId = authData.user?.id;
      if (!userId) return reply.status(401).send({ error: "Unauthorized" });

      if (!pid) {
        const { data: created, error: cErr } = await supabase
          .from("projects")
          .insert({
            user_id: userId,
            title,
            idea: idea.trim(),
            status: "generating",
            progress: 0,
          })
          .select("id")
          .single();
        if (cErr || !created) {
          return reply.status(400).send({ error: cErr?.message ?? "Failed to create project" });
        }
        pid = created.id as string;
      } else {
        const { error: uErr } = await supabase
          .from("projects")
          .update({ status: "generating", idea: idea.trim(), progress: 0 })
          .eq("id", pid);
        if (uErr) return reply.status(400).send({ error: uErr.message });
      }

      enqueueGeneration({ projectId: pid, userId, accessToken: token });

      return reply.status(202).send({
        projectId: pid,
        status: "queued",
        message: "Generation started (stub pipeline). Poll GET /generate/:id/status",
      });
    },
  );

  app.get<{ Params: { id: string } }>(
    "/generate/:id/status",
    { preHandler: requireAuth },
    async (request, reply) => {
      const supabase = (request as AuthedRequest<{ Params: { id: string } }>).authSupabase;
      const { id } = request.params;

      const { data: project, error: pErr } = await supabase
        .from("projects")
        .select("*")
        .eq("id", id)
        .maybeSingle();
      if (pErr) return reply.status(400).send({ error: pErr.message });
      if (!project) return reply.status(404).send({ error: "Project not found" });

      const { data: generations, error: gErr } = await supabase
        .from("generations")
        .select("*")
        .eq("project_id", id)
        .order("created_at", { ascending: true });
      if (gErr) return reply.status(400).send({ error: gErr.message });

      return reply.send({
        project,
        generations: generations ?? [],
      });
    },
  );
}
