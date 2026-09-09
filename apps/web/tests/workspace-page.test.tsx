import { render, screen } from "@testing-library/react";
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
          id: "akmola:1", sourceId: "051125-000-037", region: "akmola",
          district: null, locality: null, address: "ул. Абая 5", lat: null, lon: null,
          createdAt: "2025-11-05T07:34:46.138Z", closedAt: null, deadlineAt: null,
          theme: "water", rawCategory: "Отсутствие воды", subcategory: null, serviceOrg: null,
          status: "routed", rawStatus: null, appealType: "incident", channel: "ekc109",
          language: "ru", priority: "high", isOverdue: false, slaDays: null, grade: null,
          operator: null, resolution: null, searchText: "",
        };
      return Promise.resolve(
        new Response(JSON.stringify(body), { status: 200, headers: { "content-type": "application/json" } }),
      );
    }),
  );
});
afterEach(() => vi.restoreAllMocks());

test("/operator/:id renders 3 columns — sourceId in the left, a draft textarea in the right", async () => {
  render(<Providers router={makeRouter(["/operator/akmola:1"])} />);
  expect(await screen.findByText("051125-000-037")).toBeInTheDocument();
  expect(screen.getByText("Текущее обращение")).toBeInTheDocument();
  expect(screen.getByRole("textbox")).toBeInTheDocument();
});
