import { afterEach, expect, test, vi } from "vitest";
import { ApiError, apiGet } from "../src/lib/api";

afterEach(() => vi.restoreAllMocks());

test("apiGet builds query string, skips undefined, returns json", async () => {
  const fetchMock = vi.fn().mockResolvedValue(
    new Response(JSON.stringify({ ok: 1 }), {
      status: 200,
      headers: { "content-type": "application/json" },
    }),
  );
  vi.stubGlobal("fetch", fetchMock);

  const out = await apiGet<{ ok: number }>("/kpi", { region: "akmola", theme: undefined, page: 2 });

  expect(out).toEqual({ ok: 1 });
  const url = fetchMock.mock.calls[0]![0] as string;
  expect(url).toContain("/api/kpi?");
  expect(url).toContain("region=akmola");
  expect(url).toContain("page=2");
  expect(url).not.toContain("theme=");
});

test("apiGet throws ApiError with code on error envelope", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ error: { code: "bad_request", message: "bad" } }), {
        status: 400,
        headers: { "content-type": "application/json" },
      }),
    ),
  );
  await expect(apiGet("/kpi")).rejects.toMatchObject({
    name: "ApiError",
    code: "bad_request",
    status: 400,
  });
});
