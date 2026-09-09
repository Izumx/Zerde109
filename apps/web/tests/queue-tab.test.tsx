import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, useLocation } from "react-router-dom";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { I18nProvider } from "../src/app/i18n";
import { makeQueryClient } from "../src/lib/queryClient";
import { QueueTab } from "../src/features/intake/QueueTab";
import { META_FIXTURE } from "./_meta";

let calls: string[] = [];

beforeEach(() => {
  calls = [];
  vi.stubGlobal(
    "fetch",
    vi.fn((input: RequestInfo | URL) => {
      const url = String(input);
      calls.push(url);
      let body: unknown = {};
      if (url.includes("/api/meta")) body = META_FIXTURE;
      else if (url.includes("/api/appeals"))
        body = {
          items: [
            { id: "akmola:1", sourceId: "051125-000-001", region: "akmola", createdAt: "2025-11-05T09:00:00Z", theme: "water", status: "routed", priority: "high", channel: "ekc109", preview: "нет воды третий день", isOverdue: true },
            { id: "almaty:2", sourceId: "KZ250115884", region: "almaty", createdAt: "2025-01-01T00:57:07Z", theme: "roads", status: "done", priority: "low", channel: "whatsapp", preview: "яма на дороге", isOverdue: false },
          ],
          page: 1,
          pageSize: 50,
          total: 2,
        };
      return Promise.resolve(
        new Response(JSON.stringify(body), { status: 200, headers: { "content-type": "application/json" } }),
      );
    }),
  );
});
afterEach(() => vi.restoreAllMocks());

function Loc() {
  return <span data-testid="loc">{useLocation().pathname}</span>;
}

const render_ = () =>
  render(
    <QueryClientProvider client={makeQueryClient()}>
      <I18nProvider>
        <MemoryRouter>
          <QueueTab />
          <Loc />
        </MemoryRouter>
      </I18nProvider>
    </QueryClientProvider>,
  );

test("lists appeals, status filter adds status=done, row click navigates to detail", async () => {
  render_();
  expect(await screen.findByText("нет воды третий день")).toBeInTheDocument();
  expect(screen.getByText("яма на дороге")).toBeInTheDocument();

  await userEvent.selectOptions(screen.getByLabelText("Статус"), "done");
  await vi.waitFor(() => expect(calls.some((c) => c.includes("status=done"))).toBe(true));

  await userEvent.click(screen.getByText("нет воды третий день"));
  expect(screen.getByTestId("loc").textContent).toBe("/appeals/akmola:1");
});
