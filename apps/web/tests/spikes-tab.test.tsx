import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { I18nProvider } from "../src/app/i18n";
import { makeQueryClient } from "../src/lib/queryClient";
import { SpikesTab } from "../src/features/command-center/SpikesTab";
import { META_FIXTURE } from "./_meta";

function stub(spikes: unknown[]) {
  vi.stubGlobal(
    "fetch",
    vi.fn((input: RequestInfo | URL) => {
      const url = String(input);
      const body = url.includes("/api/meta") ? META_FIXTURE : url.includes("/api/spikes") ? spikes : {};
      return Promise.resolve(
        new Response(JSON.stringify(body), { status: 200, headers: { "content-type": "application/json" } }),
      );
    }),
  );
}
afterEach(() => vi.restoreAllMocks());

const render_ = (onDrill?: () => void) =>
  render(
    <QueryClientProvider client={makeQueryClient()}>
      <I18nProvider>
        <MemoryRouter>
          <SpikesTab onDrill={onDrill} />
        </MemoryRouter>
      </I18nProvider>
    </QueryClientProvider>,
  );

test("renders a spike row with label, +growth, severity; click drills", async () => {
  stub([
    { region: "akmola", theme: "water", day: "2025-03-10", baseline: 5, current: 20, ratio: 4, zscore: 5, severity: "high" },
  ]);
  const onDrill = vi.fn();
  render_(onDrill);
  expect(await screen.findByText("Водоснабжение")).toBeInTheDocument();
  expect(screen.getByText("+300%")).toBeInTheDocument();
  expect(screen.getByText("high")).toBeInTheDocument();
  await userEvent.click(screen.getByText("Водоснабжение"));
  expect(onDrill).toHaveBeenCalled();
});

test("empty spikes -> 'Всплесков не обнаружено'", async () => {
  stub([]);
  render_();
  expect(await screen.findByText("Всплесков не обнаружено")).toBeInTheDocument();
});
