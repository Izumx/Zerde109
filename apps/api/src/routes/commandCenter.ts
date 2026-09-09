import type { FastifyInstance } from "fastify";
import { z } from "zod";
import type { Granularity } from "@zerde/types";
import { getPool } from "../db";
import { parseRange } from "../schema";
import { getKpi } from "../repo/kpi";
import { getTimeseries } from "../repo/timeseries";

const zGranularity = z.enum(["day", "week", "month"]).default("month");

export async function commandCenterRoutes(app: FastifyInstance): Promise<void> {
  app.get("/api/kpi", async (req) => getKpi(getPool(), parseRange(req.query)));

  app.get("/api/timeseries", async (req) => {
    const q = req.query as Record<string, unknown>;
    const range = parseRange(q);
    const granularity = zGranularity.parse(q.granularity) as Granularity;
    return getTimeseries(getPool(), range, granularity);
  });
}
