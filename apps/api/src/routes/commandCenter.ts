import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { THEME_CODES, type BreakdownDim, type Granularity, type ThemeCode } from "@zerde/types";
import { getPool } from "../db";
import { parseRange } from "../schema";
import { getKpi } from "../repo/kpi";
import { getTimeseries } from "../repo/timeseries";
import { getBreakdown } from "../repo/breakdown";
import { getSpikes } from "../repo/spikes";
import { getForecast } from "../repo/forecast";
import { runNlQuery } from "../repo/nlQuery";

const zGranularity = z.enum(["day", "week", "month"]).default("month");
const zDim = z.enum(["region", "theme", "status", "channel"]);
const zForecastQuery = z.object({
  region: z.string().min(1),
  theme: z.enum(THEME_CODES as [string, ...string[]]),
});
const zNlQueryBody = z.object({
  q: z.string().min(1).max(500),
});

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

  app.get("/api/spikes", async (req) => {
    return getSpikes(getPool(), parseRange(req.query));
  });

  app.get("/api/forecast", async (req) => {
    const q = zForecastQuery.parse(req.query);
    return getForecast(getPool(), q.region, q.theme as ThemeCode);
  });

  app.post("/api/nl-query", async (req) => {
    const body = zNlQueryBody.parse(req.body);
    return runNlQuery(getPool(), body.q);
  });
}
