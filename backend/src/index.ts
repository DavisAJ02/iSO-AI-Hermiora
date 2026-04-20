import "dotenv/config";
import Fastify from "fastify";
import { registerProjectRoutes } from "./modules/projects/routes.js";
import { registerGenerationRoutes } from "./modules/generation/routes.js";
import { registerPaymentRoutes } from "./modules/payments/routes.js";

const port = Number(process.env.PORT) || 4000;

async function main(): Promise<void> {
  const app = Fastify({ logger: true });

  app.get("/health", async () => ({ ok: true, service: "hermiora-api" }));

  await registerProjectRoutes(app);
  await registerGenerationRoutes(app);
  await registerPaymentRoutes(app);

  await app.listen({ port, host: "0.0.0.0" });
  app.log.info(`Listening on http://localhost:${port}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
