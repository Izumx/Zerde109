import { render, screen } from "@testing-library/react";
import { QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { afterEach, expect, test, vi } from "vitest";
import { I18nProvider } from "../src/app/i18n";
import { makeQueryClient } from "../src/lib/queryClient";
import { ModelQualityTab } from "../src/features/intake/ModelQualityTab";
import { META_FIXTURE } from "./_meta";

afterEach(() => vi.restoreAllMocks());

function stub(status: number, evalBody: unknown) {
  vi.stubGlobal(
    "fetch",
    vi.fn((input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/api/meta"))
        return Promise.resolve(new Response(JSON.stringify(META_FIXTURE), { status: 200, headers: { "content-type": "application/json" } }));
      return Promise.resolve(
        new Response(JSON.stringify(evalBody), { status, headers: { "content-type": "application/json" } }),
      );
    }),
  );
}

const render_ = () =>
  render(
    <QueryClientProvider client={makeQueryClient()}>
      <I18nProvider>
        <MemoryRouter>
          <ModelQualityTab />
        </MemoryRouter>
      </I18nProvider>
    </QueryClientProvider>,
  );

test("renders accuracy, macro-f1 and a per-theme row", async () => {
  stub(200, {
    method: "keyword-baseline",
    computedAt: "2025-01-01T00:00:00Z",
    nHoldout: 1000,
    accuracy: 0.97,
    macroF1: 0.88,
    perTheme: [{ theme: "water", precision: 0.95, recall: 0.91, f1: 0.93, support: 200 }],
    confusion: [
      { actual: "water", predicted: "water", n: 180 },
      { actual: "water", predicted: "roads", n: 20 },
    ],
  });
  render_();
  expect(await screen.findByText("97%")).toBeInTheDocument();
  expect(screen.getByText("88%")).toBeInTheDocument();
  expect(screen.getByText("Водоснабжение")).toBeInTheDocument();
  expect(screen.getByText("93%")).toBeInTheDocument();
});

test("404 -> hint about npm run eval", async () => {
  stub(404, { error: { code: "not_found", message: "no eval" } });
  render_();
  expect(await screen.findByText(/npm run eval/)).toBeInTheDocument();
});
