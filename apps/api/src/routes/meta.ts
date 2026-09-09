import type { FastifyInstance } from "fastify";
import { getPool } from "../db";
import { getMeta } from "../repo/meta";

export async function metaRoutes(app: FastifyInstance): Promise<void> {
  app.get("/api/meta", async () => getMeta(getPool()));
}
