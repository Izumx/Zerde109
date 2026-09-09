import { render, screen } from "@testing-library/react";
import { afterEach, expect, test, vi } from "vitest";
import { Providers } from "../src/app/providers";
import { makeRouter } from "../src/app/router";
import { META_FIXTURE } from "./_meta";

afterEach(() => vi.restoreAllMocks());

function stub(status: number, appeal: unknown) {
  vi.stubGlobal(
    "fetch",
    vi.fn((input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/api/meta"))
        return Promise.resolve(new Response(JSON.stringify(META_FIXTURE), { status: 200, headers: { "content-type": "application/json" } }));
      return Promise.resolve(
        new Response(JSON.stringify(appeal), { status, headers: { "content-type": "application/json" } }),
      );
    }),
  );
}

test("renders an appeal card by :id", async () => {
  stub(200, {
    id: "akmola:1",
    sourceId: "051125-000-037",
    region: "akmola",
    district: null,
    locality: "Кокшетау",
    address: "ул. Абая 5",
    lat: null,
    lon: null,
    createdAt: "2025-11-05T07:34:46.138Z",
    closedAt: null,
    deadlineAt: "2025-11-10T09:53:00.123Z",
    theme: "water",
    rawCategory: "Отсутствие воды",
    subcategory: null,
    serviceOrg: "ГКП Су Арнасы",
    status: "routed",
    rawStatus: "Передано в службу",
    appealType: "incident",
    channel: "ekc109",
    language: "ru",
    priority: "high",
    isOverdue: true,
    slaDays: 5,
    grade: null,
    operator: null,
    resolution: null,
    searchText: "отсутствие воды",
  });
  render(<Providers router={makeRouter(["/appeals/akmola:1"])} />);
  expect(await screen.findByText("051125-000-037")).toBeInTheDocument();
  expect(screen.getByText("Отсутствие воды")).toBeInTheDocument();
  expect(screen.getByText("ул. Абая 5")).toBeInTheDocument();
  expect(screen.getByText("ГКП Су Арнасы")).toBeInTheDocument();
});

test("404 -> not found + back link", async () => {
  stub(404, { error: { code: "not_found", message: "no" } });
  render(<Providers router={makeRouter(["/appeals/nope:0"])} />);
  expect(await screen.findByText("Обращение не найдено")).toBeInTheDocument();
});
