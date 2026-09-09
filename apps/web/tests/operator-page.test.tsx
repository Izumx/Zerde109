import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { Providers } from "../src/app/providers";
import { makeRouter } from "../src/app/router";
import { META_FIXTURE } from "./_meta";

beforeEach(() => {
  localStorage.clear();
  localStorage.setItem("zerde.role", "operator");
  vi.stubGlobal(
    "fetch",
    vi.fn((input: RequestInfo | URL) => {
      const url = String(input);
      let body: unknown = {};
      if (url.includes("/api/meta")) body = META_FIXTURE;
      else if (url.includes("/api/appeals"))
        body = {
          items: [
            { id: "akmola:1", sourceId: "051125-000-001", region: "akmola", createdAt: "2025-11-05T09:00:00Z", theme: "water", status: "routed", priority: "high", channel: "ekc109", preview: "нет воды", isOverdue: true },
          ],
          page: 1,
          pageSize: 25,
          total: 1,
        };
      return Promise.resolve(
        new Response(JSON.stringify(body), { status: 200, headers: { "content-type": "application/json" } }),
      );
    }),
  );
});
afterEach(() => vi.restoreAllMocks());

test("/operator lists open appeals; row click opens /operator/:id", async () => {
  render(<Providers router={makeRouter(["/operator"])} />);
  expect(await screen.findByText("нет воды")).toBeInTheDocument();
  await userEvent.click(screen.getByText("нет воды"));
  expect(await screen.findByText(/Рабочий экран оператора: akmola:1/)).toBeInTheDocument();
});
