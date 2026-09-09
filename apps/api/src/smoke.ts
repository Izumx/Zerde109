import "@zerde/ingest/loadEnv";
import { buildServer } from "./server";

export async function runSmoke(): Promise<void> {
  const app = await buildServer({ logger: false });

  let hasError = false;

  async function check(
    method: "GET" | "POST",
    url: string,
    payload?: unknown,
    allow404 = false,
  ): Promise<unknown> {
    const t0 = performance.now();
    const res = await app.inject({
      method,
      url,
      payload: payload as object,
    });
    const ms = Math.round(performance.now() - t0);
    const ok = (res.statusCode >= 200 && res.statusCode < 300) || (allow404 && res.statusCode === 404);
    const mark = ok ? "✓" : "✗";
    console.log(`${mark} ${method} ${url} -> ${res.statusCode} (${ms}ms)`);
    if (!ok) {
      console.error(`  Error response:`, res.body);
      hasError = true;
    }
    const isJson = res.headers["content-type"]?.includes("application/json");
    return isJson ? res.json() : res.payload;
  }

  console.log("Starting smoke tests against live database...");

  await check("GET", "/api/health");
  await check("GET", "/api/meta");
  await check("GET", "/api/kpi");
  await check("GET", "/api/timeseries?granularity=month");
  await check("GET", "/api/breakdown?dim=theme");
  await check("GET", "/api/spikes");
  await check("GET", "/api/forecast?region=akmola&theme=water");

  const appealsList = (await check("GET", "/api/appeals?pageSize=5")) as {
    items: { id: string }[];
  } | null;

  const firstId = appealsList?.items?.[0]?.id;
  if (firstId) {
    await check("GET", `/api/appeals/${firstId}`);
    await check("GET", `/api/appeals/${firstId}/similar`);
    await check("GET", `/api/appeals/${firstId}/duplicates`);
  }

  await check("GET", "/api/templates");
  await check("POST", "/api/classify", { text: "нет воды в доме по ул. Абая 10" });
  await check("POST", "/api/nl-query", { q: "топ 5 тем за месяц" });
  await check("POST", "/api/report", { view: "overview", format: "xlsx" });
  await check("GET", "/api/model-eval", undefined, true);

  await app.close();

  if (hasError) {
    console.error("Smoke tests FAILED");
    process.exit(1);
  } else {
    console.log("All smoke tests PASSED");
  }
}

const isDirectRun =
  process.argv[1] &&
  (process.argv[1].endsWith("smoke.ts") || process.argv[1].endsWith("smoke.js"));

if (isDirectRun) {
  runSmoke().catch((err) => {
    console.error("Smoke run exception:", err);
    process.exit(1);
  });
}
