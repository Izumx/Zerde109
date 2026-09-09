import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { THEME_CODES, type Language, type ThemeCode } from "@zerde/types";
import { getPool } from "../db";
import { getDuplicates, getSimilar } from "../repo/similar";
import { getTemplates } from "../repo/templates";
import { recordMutation } from "../repo/mutations";

const zTemplatesQuery = z.object({
  theme: z.enum(THEME_CODES as [string, ...string[]]).optional(),
  service: z.string().optional(),
  lang: z.enum(["kk", "ru"]).optional(),
});

const zRouteBody = z.object({
  kind: z.enum(["route", "draft", "mark_duplicate"]),
  payload: z.record(z.unknown()),
});

export async function operatorRoutes(app: FastifyInstance): Promise<void> {
  app.get<{ Params: { id: string } }>("/api/appeals/:id/similar", async (req) => {
    return getSimilar(getPool(), req.params.id);
  });

  app.get<{ Params: { id: string } }>("/api/appeals/:id/duplicates", async (req) => {
    return getDuplicates(getPool(), req.params.id);
  });

  app.get("/api/templates", async (req) => {
    const q = zTemplatesQuery.parse(req.query);
    return getTemplates(getPool(), {
      theme: q.theme as ThemeCode | undefined,
      service: q.service,
      lang: q.lang as Language | undefined,
    });
  });

  app.post<{ Params: { id: string } }>("/api/appeals/:id/route", async (req) => {
    const body = zRouteBody.parse(req.body);
    return recordMutation(getPool(), req.params.id, body.kind, body.payload);
  });
}
