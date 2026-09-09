import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { I18nProvider } from "../src/app/i18n";
import { makeQueryClient } from "../src/lib/queryClient";
import { ClassifyPanel } from "../src/features/intake/ClassifyPanel";
import { META_FIXTURE } from "./_meta";

beforeEach(() => {
  vi.stubGlobal(
    "fetch",
    vi.fn((input: RequestInfo | URL) => {
      const url = String(input);
      const body = url.includes("/api/meta")
        ? META_FIXTURE
        : {
            theme: "roads",
            service: "vodokanal",
            priority: "high",
            language: "ru",
            confidence: 0.92,
            entities: { address: "ул. Абая 5", object: "светофор", problem: "не работает" },
          };
      return Promise.resolve(
        new Response(JSON.stringify(body), { status: 200, headers: { "content-type": "application/json" } }),
      );
    }),
  );
});
afterEach(() => vi.restoreAllMocks());

test("classifies text and shows theme label, confidence, entities, JSON", async () => {
  render(
    <QueryClientProvider client={makeQueryClient()}>
      <I18nProvider>
        <MemoryRouter>
          <ClassifyPanel />
        </MemoryRouter>
      </I18nProvider>
    </QueryClientProvider>,
  );
  await userEvent.type(screen.getByRole("textbox"), "не работает светофор");
  await userEvent.click(screen.getByRole("button", { name: "Классифицировать" }));

  expect(await screen.findByText("Дороги")).toBeInTheDocument();
  expect(screen.getByText("92%")).toBeInTheDocument();
  expect(screen.getByText("ул. Абая 5")).toBeInTheDocument();

  await userEvent.click(screen.getByText("JSON"));
  expect(screen.getByText(/"theme": "roads"/)).toBeInTheDocument();
});
