import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { Providers } from "../src/app/providers";
import { makeRouter } from "../src/app/router";
import { META_FIXTURE } from "./_meta";

beforeEach(() => {
  localStorage.clear();
  vi.stubGlobal(
    "fetch",
    vi.fn((input: RequestInfo | URL) => {
      const url = String(input);
      let body: unknown = {};
      if (url.includes("/api/meta")) body = META_FIXTURE;
      else if (url.includes("/api/kpi"))
        body = { total: 999, prevTotal: 900, deltaPct: 0.11, overdueShare: 0.1, avgCloseHours: 20, repeatShare: 0.05, openNow: 100 };
      else if (url.includes("/api/timeseries")) body = { granularity: "month", points: [] };
      else if (url.includes("/api/breakdown")) body = [];
      else if (url.includes("/api/spikes")) body = [];
      return Promise.resolve(
        new Response(JSON.stringify(body), { status: 200, headers: { "content-type": "application/json" } }),
      );
    }),
  );
});
afterEach(() => vi.restoreAllMocks());

test("/command-center shows KPI + 5 tabs; switching to Всплески shows empty state", async () => {
  render(<Providers router={makeRouter(["/command-center"])} />);

  expect(await screen.findByText("999")).toBeInTheDocument();
  const tabs = screen.getAllByRole("tab");
  expect(tabs).toHaveLength(5);

  await userEvent.click(screen.getByRole("tab", { name: "Всплески" }));
  expect(await screen.findByText("Всплесков не обнаружено")).toBeInTheDocument();
});
