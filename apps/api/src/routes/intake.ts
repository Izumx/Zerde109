import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { getPool } from "../db";
import { notFound } from "../errors";
import { parseRange, zPagination, zPriority, zRange, zStatus } from "../schema";
import { getAppeal, listAppeals } from "../repo/appeals";
import { classify } from "../repo/classify";

const zListQuery = zRange.merge(zPagination).extend({
  status: zStatus.optional(),
  priority: zPriority.optional(),
  search: z.string().optional(),
  sort: z.enum(["created_desc", "created_asc"]).default("created_desc"),
});

const zClassifyBody = z.object({
  text: z.string().min(1).max(4000),
  language: z.enum(["kk", "ru"]).optional(),
});

export async function intakeRoutes(app: FastifyInstance): Promise<void> {
  app.get("/api/appeals", async (req) => {
    const q = zListQuery.parse(req.query);
    const range = parseRange(q);
    return listAppeals(getPool(), {
      ...range,
      status: q.status,
      priority: q.priority,
      search: q.search,
      page: q.page,
      pageSize: q.pageSize,
      sort: q.sort,
    });
  });

  app.get<{ Params: { id: string } }>("/api/appeals/:id", async (req) => {
    const appeal = await getAppeal(getPool(), req.params.id);
    if (!appeal) throw notFound(`Appeal ${req.params.id} not found`);
    return appeal;
  });

  app.post("/api/classify", async (req) => {
    const body = zClassifyBody.parse(req.body);
    return classify(body.text, body.language);
  });
}
