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
      else if (/\/api\/appeals\/[^/]+\/similar/.test(url)) body = [];
      else if (/\/api\/appeals\/[^/]+\/duplicates/.test(url)) body = { nearDuplicates: [], repeats: [] };
      else if (url.includes("/api/templates")) body = [];
      else if (/\/api\/appeals\/[^/]+$/.test(url))
        body = {
          id: "akmola:1", sourceId: "051125-000-001", region: "akmola",
          district: null, locality: null, address: "ул. Тест 1", lat: null, lon: null,
          createdAt: "2025-11-05T09:00:00Z", closedAt: null, deadlineAt: null,
          theme: "water", rawCategory: "Отсутствие воды", subcategory: null, serviceOrg: null,
          status: "routed", rawStatus: null, appealType: "incident", channel: "ekc109",
          language: "ru", priority: "high", isOverdue: true, slaDays: null, grade: null,
          operator: null, resolution: null, searchText: "",
        };
      else if (url.includes("/api/appeals"))
        body = {
          items: [
            { id: "akmola:1", sourceId: "051125-000-001", region: "akmola", createdAt: "2025-11-05T09:00:00Z", theme: "water", status: "routed", priority: "high", channel: "ekc109", preview: "нет воды", isOverdue: true },
          ],
          page: 1, pageSize: 25, total: 1,
        };
      return Promise.resolve(
        new Response(JSON.stringify(body), { status: 200, headers: { "content-type": "application/json" } }),
      );
    }),
  );
});
afterEach(() => vi.restoreAllMocks());

test("/operator lists open appeals; row click navigates to the workspace", async () => {
  const router = makeRouter(["/operator"]);
  render(<Providers router={router} />);
  expect(await screen.findByText("нет воды")).toBeInTheDocument();
  await userEvent.click(screen.getByText("нет воды"));
  expect(router.state.location.pathname).toBe("/operator/akmola:1");
});
