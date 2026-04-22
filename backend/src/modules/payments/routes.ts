import { randomUUID } from "node:crypto";
import type { FastifyInstance } from "fastify";
import type { AuthedRequest } from "../../types/authed-request.js";
import { requireAuth } from "../auth/preHandler.js";
import { createServiceSupabaseClient } from "../../lib/supabase.js";

type InitiateBody = {
  amount: number;
  currency?: string;
  provider: "apple" | "mobile_money";
};

export async function registerPaymentRoutes(app: FastifyInstance): Promise<void> {
  app.post<{ Body: InitiateBody }>(
    "/payment/initiate",
    { preHandler: requireAuth },
    async (request, reply) => {
      const supabase = (request as AuthedRequest<{ Body: InitiateBody }>).authSupabase;
      const body = request.body;
      if (!body?.amount || body.amount <= 0) {
        return reply.status(400).send({ error: "amount must be a positive number" });
      }
      if (!body.provider || !["apple", "mobile_money"].includes(body.provider)) {
        return reply.status(400).send({ error: "provider must be apple or mobile_money" });
      }

      const reference = `pay_${randomUUID().replace(/-/g, "")}`;

      const { data: authData } = await supabase.auth.getUser();
      const userId = authData.user?.id;
      if (!userId) return reply.status(401).send({ error: "Unauthorized" });

      const serviceSupabase = createServiceSupabaseClient();
      const { data, error } = await serviceSupabase
        .from("payments")
        .insert({
          user_id: userId,
          amount: body.amount,
          currency: body.currency ?? "USD",
          provider: body.provider,
          status: "PENDING",
          reference,
        })
        .select("*")
        .single();

      if (error) return reply.status(400).send({ error: error.message });
      return reply.status(201).send({ payment: data });
    },
  );

  app.get<{ Params: { ref: string } }>(
    "/payment/status/:ref",
    { preHandler: requireAuth },
    async (request, reply) => {
      const supabase = (request as AuthedRequest<{ Params: { ref: string } }>).authSupabase;
      const { ref } = request.params;
      const { data, error } = await supabase
        .from("payments")
        .select("*")
        .eq("reference", ref)
        .maybeSingle();
      if (error) return reply.status(400).send({ error: error.message });
      if (!data) return reply.status(404).send({ error: "Payment not found" });
      return reply.send({ payment: data });
    },
  );
}
