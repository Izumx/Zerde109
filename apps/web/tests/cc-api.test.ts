import { renderHook, waitFor } from "@testing-library/react";
import { QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { createElement, type ReactNode } from "react";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { makeQueryClient } from "../src/lib/queryClient";
import { useForecast, useKpi } from "../src/features/command-center/api";

function wrapper({ children }: { children: ReactNode }) {
  return createElement(
    QueryClientProvider,
    { client: makeQueryClient() },
    createElement(MemoryRouter, null, children),
  );
}

beforeEach(() => {
  vi.stubGlobal(
    "fetch",
    vi.fn((input: RequestInfo | URL) => {
      const url = String(input);
      const body = url.includes("/api/kpi")
        ? { total: 5, prevTotal: 4, deltaPct: 0.25, overdueShare: 0, avgCloseHours: null, repeatShare: 0, openNow: 2 }
        : {};
      return Promise.resolve(
        new Response(JSON.stringify(body), {
          status: 200,
          headers: { "content-type": "application/json" },
        }),
      );
    }),
  );
});
afterEach(() => vi.restoreAllMocks());

test("useKpi fetches /api/kpi and returns data", async () => {
  const { result } = renderHook(() => useKpi(), { wrapper });
  await waitFor(() => expect(result.current.data?.total).toBe(5));
});

test("useForecast is disabled until both region and theme are set", async () => {
  const { result } = renderHook(() => useForecast(undefined, undefined), { wrapper });
  expect(result.current.fetchStatus).toBe("idle");
  expect(result.current.data).toBeUndefined();
});
