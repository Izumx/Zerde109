import { renderHook } from "@testing-library/react";
import { QueryClientProvider } from "@tanstack/react-query";
import { createElement, type ReactNode } from "react";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { ThemeProvider } from "../src/app/theme";
import { makeQueryClient } from "../src/lib/queryClient";
import { DEFAULT_SERIES, useSeriesColors } from "../src/components/charts/chartTheme";
import { stubMetaFetch } from "./_meta";

beforeEach(() => stubMetaFetch());
afterEach(() => vi.restoreAllMocks());

function wrapper({ children }: { children: ReactNode }) {
  return createElement(
    QueryClientProvider,
    { client: makeQueryClient() },
    createElement(ThemeProvider, null, children),
  );
}

test("DEFAULT_SERIES is >= 6 valid hex colours", () => {
  expect(DEFAULT_SERIES.length).toBeGreaterThanOrEqual(6);
  for (const c of DEFAULT_SERIES) expect(c).toMatch(/^#[0-9a-f]{6}$/i);
});

test("useSeriesColors: theme codes -> meta colour; other keys -> ramp in order", async () => {
  const { result } = renderHook(() => useSeriesColors(), { wrapper });
  // подождать meta
  await vi.waitFor(() => {
    const c = result.current(["water"]);
    expect(c.water).toBe("#2563eb"); // META_FIXTURE water colour
  });
  const colors = result.current(["water", "roads", "akmola", "almaty"]);
  expect(colors.water).toBe("#2563eb");
  expect(colors.roads).toBe("#475569");
  expect(colors.akmola).toBe(DEFAULT_SERIES[0]);
  expect(colors.almaty).toBe(DEFAULT_SERIES[1]);
});
