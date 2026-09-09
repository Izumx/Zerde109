import { render, screen } from "@testing-library/react";
import { QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { I18nProvider } from "../src/app/i18n";
import { makeQueryClient } from "../src/lib/queryClient";
import { KpiRow } from "../src/features/command-center/KpiRow";

beforeEach(() => {
  vi.stubGlobal(
    "fetch",
    vi.fn(() =>
      Promise.resolve(
        new Response(
          JSON.stringify({
            total: 1234,
            prevTotal: 1000,
            deltaPct: 0.234,
            overdueShare: 0.12,
            avgCloseHours: 40,
            repeatShare: 0.08,
            openNow: 300,
          }),
          { status: 200, headers: { "content-type": "application/json" } },
        ),
      ),
    ),
  );
});
afterEach(() => vi.restoreAllMocks());

test("KpiRow renders six KPI values from /api/kpi", async () => {
  render(
    <QueryClientProvider client={makeQueryClient()}>
      <I18nProvider>
        <MemoryRouter>
          <KpiRow />
        </MemoryRouter>
      </I18nProvider>
    </QueryClientProvider>,
  );
  expect(await screen.findByText("1 234")).toBeInTheDocument();
  expect(screen.getByText("300")).toBeInTheDocument();
  expect(screen.getByText("12%")).toBeInTheDocument();
  expect(screen.getAllByText("+23%").length).toBeGreaterThan(0);
});
