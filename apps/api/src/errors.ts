import type { FastifyInstance } from "fastify";

export class AppError extends Error {
  constructor(
    readonly code: string,
    message: string,
    readonly statusCode: number,
  ) {
    super(message);
  }
}

export const badRequest = (m: string): AppError => new AppError("bad_request", m, 400);
export const notFound = (m: string): AppError => new AppError("not_found", m, 404);
export const unrecognized = (m: string): AppError => new AppError("unrecognized_query", m, 422);

export function registerErrorHandler(app: FastifyInstance): void {
  app.setErrorHandler((err, _req, reply) => {
    if (err instanceof AppError) {
      reply.code(err.statusCode).send({ error: { code: err.code, message: err.message } });
      return;
    }
    const anyErr = err as { validation?: unknown; message?: string };
    if (anyErr.validation) {
      reply.code(400).send({ error: { code: "bad_request", message: anyErr.message ?? "validation error" } });
      return;
    }
    app.log.error(err);
    reply.code(500).send({ error: { code: "internal", message: "internal error" } });
  });
  app.setNotFoundHandler((_req, reply) => {
    reply.code(404).send({ error: { code: "not_found", message: "route not found" } });
  });
}
