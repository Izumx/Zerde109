import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { getPool } from "../db";
import { parseRange, zRange } from "../schema";
import { buildReportData, toPdf, toXlsx } from "../repo/report";

const zReportBody = z.object({
  view: z.enum(["overview", "regions", "themes"]),
  format: z.enum(["xlsx", "pdf"]),
  filters: zRange.optional(),
});

export async function reportRoutes(app: FastifyInstance): Promise<void> {
  app.post("/api/report", async (req, reply) => {
    const body = zReportBody.parse(req.body);
    const data = await buildReportData(getPool(), body.view, body.filters ? parseRange(body.filters) : {});
    const dateStr = new Date().toISOString().slice(0, 10);

    if (body.format === "xlsx") {
      const buf = await toXlsx(data);
      reply
        .header(
          "Content-Type",
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        )
        .header(
          "Content-Disposition",
          `attachment; filename="zerde-${body.view}-${dateStr}.xlsx"`,
        )
        .send(buf);
      return;
    }

    const buf = await toPdf(data);
    reply
      .header("Content-Type", "application/pdf")
      .header(
        "Content-Disposition",
        `attachment; filename="zerde-${body.view}-${dateStr}.pdf"`,
      )
      .send(buf);
  });
}
