import type { FastifyInstance } from "fastify";
import { z } from "zod";
import type { BreakdownDim, Granularity } from "@zerde/types";
import { getPool } from "../db";
import { parseRange } from "../schema";
import { getKpi } from "../repo/kpi";
import { getTimeseries } from "../repo/timeseries";
import { getBreakdown } from "../repo/breakdown";

const zGranularity = z.enum(["day", "week", "month"]).default("month");
const zDim = z.enum(["region", "theme", "status", "channel"]);

export async function commandCenterRoutes(app: FastifyInstance): Promise<void> {
  app.get("/api/kpi", async (req) => getKpi(getPool(), parseRange(req.query)));

  app.get("/api/timeseries", async (req) => {
    const q = req.query as Record<string, unknown>;
    const range = parseRange(q);
    const granularity = zGranularity.parse(q.granularity) as Granularity;
    return getTimeseries(getPool(), range, granularity);
  });

  app.get("/api/breakdown", async (req) => {
    const q = req.query as Record<string, unknown>;
    const range = parseRange(q);
    const dim = zDim.parse(q.dim) as BreakdownDim;
    return getBreakdown(getPool(), range, dim);
  });
}
