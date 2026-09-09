import type { FastifyInstance } from "fastify";
import { getPool } from "../db";
import { parseRange } from "../schema";
import { getKpi } from "../repo/kpi";

export async function commandCenterRoutes(app: FastifyInstance): Promise<void> {
  app.get("/api/kpi", async (req) => getKpi(getPool(), parseRange(req.query)));
}
