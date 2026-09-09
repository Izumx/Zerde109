import "@zerde/ingest/loadEnv";
import { buildServer } from "./server";
import { readEnv } from "./env";

const { port } = readEnv();
const app = await buildServer({ logger: true });
await app.listen({ host: "127.0.0.1", port });
