import { render, screen } from "@testing-library/react";
import { QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { I18nProvider } from "../src/app/i18n";
import { makeQueryClient } from "../src/lib/queryClient";
import { CurrentAppealCol } from "../src/features/operator/CurrentAppealCol";
import { META_FIXTURE } from "./_meta";

beforeEach(() => {
  vi.stubGlobal(
    "fetch",
    vi.fn((input: RequestInfo | URL) => {
      const url = String(input);
      const body = url.includes("/api/meta")
        ? META_FIXTURE
        : {
            id: "akmola:1",
            sourceId: "051125-000-037",
            region: "akmola",
            district: null,
            locality: "Кокшетау",
            address: "ул. Абая 5",
            lat: null, lon: null,
            createdAt: "2025-11-05T07:34:46.138Z",
            closedAt: null,
            deadlineAt: "2025-11-10T09:53:00.123Z",
            theme: "water",
            rawCategory: "Отсутствие воды",
            subcategory: null, serviceOrg: null,
            status: "routed", rawStatus: null,
            appealType: "incident", channel: "ekc109",
            language: "ru", priority: "high", isOverdue: true,
            slaDays: 5, grade: null, operator: null, resolution: null,
            searchText: "",
          };
      return Promise.resolve(
        new Response(JSON.stringify(body), { status: 200, headers: { "content-type": "application/json" } }),
      );
    }),
  );
});
afterEach(() => vi.restoreAllMocks());

test("shows sourceId, address and category for the appeal id", async () => {
  render(
    <QueryClientProvider client={makeQueryClient()}>
      <I18nProvider>
        <MemoryRouter>
          <CurrentAppealCol id="akmola:1" />
        </MemoryRouter>
      </I18nProvider>
    </QueryClientProvider>,
  );
  expect(await screen.findByText("051125-000-037")).toBeInTheDocument();
  expect(screen.getByText("ул. Абая 5")).toBeInTheDocument();
  expect(screen.getByText("Отсутствие воды")).toBeInTheDocument();
});
