import Fastify, { type FastifyInstance } from "fastify";
import cors from "@fastify/cors";
import sensible from "@fastify/sensible";
import { registerErrorHandler } from "./errors";

import { metaRoutes } from "./routes/meta";
import { commandCenterRoutes } from "./routes/commandCenter";
import { intakeRoutes } from "./routes/intake";
import { operatorRoutes } from "./routes/operator";

export async function buildServer(opts: { logger?: boolean } = {}): Promise<FastifyInstance> {
  const app = Fastify({ logger: opts.logger ?? false });
  await app.register(cors, { origin: true });
  await app.register(sensible);
  registerErrorHandler(app);

  app.get("/api/health", async () => ({ ok: true }));

  await app.register(metaRoutes);
  await app.register(commandCenterRoutes);
  await app.register(intakeRoutes);
  await app.register(operatorRoutes);
  // await app.register(reportRoutes);          // Task 13

  return app;
}
