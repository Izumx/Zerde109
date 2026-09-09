import { render, screen } from "@testing-library/react";
import { QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { I18nProvider } from "../src/app/i18n";
import { ThemeProvider } from "../src/app/theme";
import { makeQueryClient } from "../src/lib/queryClient";
import { ForecastTab } from "../src/features/command-center/ForecastTab";
import { META_FIXTURE } from "./_meta";

beforeEach(() => {
  vi.stubGlobal(
    "fetch",
    vi.fn((input: RequestInfo | URL) => {
      const url = String(input);
      let body: unknown = {};
      if (url.includes("/api/meta")) body = META_FIXTURE;
      else if (url.includes("/api/forecast"))
        body = {
          region: "akmola",
          theme: "water",
          method: "seasonal-naive",
          history: [{ month: "2024-12-01", count: 10 }],
          forecast: [{ month: "2025-01-01", yhat: 12, yhatLower: 8, yhatUpper: 16 }],
        };
      return Promise.resolve(
        new Response(JSON.stringify(body), { status: 200, headers: { "content-type": "application/json" } }),
      );
    }),
  );
});
afterEach(() => vi.restoreAllMocks());

test("ForecastTab renders chart + method label", async () => {
  render(
    <QueryClientProvider client={makeQueryClient()}>
      <ThemeProvider>
        <I18nProvider>
          <MemoryRouter>
            <ForecastTab />
          </MemoryRouter>
        </I18nProvider>
      </ThemeProvider>
    </QueryClientProvider>,
  );
  expect(await screen.findByText(/seasonal-naive/)).toBeInTheDocument();
  expect(document.querySelector("svg")).toBeTruthy();
});
