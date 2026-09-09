import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, useLocation } from "react-router-dom";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { I18nProvider } from "../src/app/i18n";
import { ThemeProvider } from "../src/app/theme";
import { makeQueryClient } from "../src/lib/queryClient";
import { OverviewTab } from "../src/features/command-center/OverviewTab";
import { META_FIXTURE } from "./_meta";

beforeEach(() => {
  vi.stubGlobal(
    "fetch",
    vi.fn((input: RequestInfo | URL) => {
      const url = String(input);
      let body: unknown = {};
      if (url.includes("/api/meta")) body = META_FIXTURE;
      else if (url.includes("/api/timeseries"))
        body = { granularity: "month", points: [
          { bucket: "2025-01-01", count: 10, overdue: 2 },
          { bucket: "2025-02-01", count: 20, overdue: 3 },
        ] };
      else if (url.includes("dim=theme"))
        body = [
          { key: "water", label: "Водоснабжение", count: 40, overdue: 5, deltaPct: 0.1 },
          { key: "roads", label: "Дороги", count: 25, overdue: 2, deltaPct: -0.05 },
        ];
      else if (url.includes("dim=region"))
        body = [
          { key: "akmola", label: "Акмолинская область", count: 30, overdue: 3, deltaPct: 0 },
          { key: "almaty", label: "Алматинская область", count: 12, overdue: 1, deltaPct: 0 },
        ];
      return Promise.resolve(
        new Response(JSON.stringify(body), { status: 200, headers: { "content-type": "application/json" } }),
      );
    }),
  );
});
afterEach(() => vi.restoreAllMocks());

function LocationProbe() {
  const loc = useLocation();
  return <span data-testid="loc">{loc.search}</span>;
}

test("OverviewTab renders charts and region click writes ?region=", async () => {
  render(
    <QueryClientProvider client={makeQueryClient()}>
      <ThemeProvider>
        <I18nProvider>
          <MemoryRouter>
            <OverviewTab />
            <LocationProbe />
          </MemoryRouter>
        </I18nProvider>
      </ThemeProvider>
    </QueryClientProvider>,
  );

  expect(await screen.findByText("Акмолинская область")).toBeInTheDocument();
  const svgs = document.querySelectorAll("svg");
  expect(svgs.length).toBeGreaterThan(0);

  await userEvent.click(screen.getByText("Акмолинская область"));
  expect(screen.getByTestId("loc").textContent).toContain("region=akmola");
});
