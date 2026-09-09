import Fastify, { type FastifyInstance } from "fastify";
import cors from "@fastify/cors";
import sensible from "@fastify/sensible";
import { registerErrorHandler } from "./errors";

import { metaRoutes } from "./routes/meta";
import { commandCenterRoutes } from "./routes/commandCenter";

export async function buildServer(opts: { logger?: boolean } = {}): Promise<FastifyInstance> {
  const app = Fastify({ logger: opts.logger ?? false });
  await app.register(cors, { origin: true });
  await app.register(sensible);
  registerErrorHandler(app);

  app.get("/api/health", async () => ({ ok: true }));

  await app.register(metaRoutes);
  await app.register(commandCenterRoutes);
  // await app.register(intakeRoutes);          // Tasks 9-10
  // await app.register(operatorRoutes);        // Task 12
  // await app.register(reportRoutes);          // Task 13

  return app;
}
