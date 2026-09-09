import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { I18nProvider } from "../src/app/i18n";
import { makeQueryClient } from "../src/lib/queryClient";
import { SimilarCol } from "../src/features/operator/SimilarCol";
import { META_FIXTURE } from "./_meta";

beforeEach(() => {
  vi.stubGlobal(
    "fetch",
    vi.fn((input: RequestInfo | URL) => {
      const url = String(input);
      const body = url.includes("/api/meta")
        ? META_FIXTURE
        : [
            {
              id: "x",
              createdAt: "2025-02-01T00:00:00Z",
              region: "akmola",
              theme: "water",
              preview: "нет воды третий день",
              serviceOrg: "Су Арнасы",
              resolution: "устранено, подача восстановлена",
              daysToClose: 2,
              similarity: 0.83,
            },
          ];
      return Promise.resolve(
        new Response(JSON.stringify(body), { status: 200, headers: { "content-type": "application/json" } }),
      );
    }),
  );
});
afterEach(() => vi.restoreAllMocks());

test("lists a similar case and 'Взять решение' calls back with its resolution", async () => {
  const onUse = vi.fn();
  render(
    <QueryClientProvider client={makeQueryClient()}>
      <I18nProvider>
        <MemoryRouter>
          <SimilarCol id="akmola:1" onUseResolution={onUse} />
        </MemoryRouter>
      </I18nProvider>
    </QueryClientProvider>,
  );
  expect(await screen.findByText("нет воды третий день")).toBeInTheDocument();
  expect(screen.getByText(/83%/)).toBeInTheDocument();
  await userEvent.click(screen.getByRole("button", { name: "Взять решение" }));
  expect(onUse).toHaveBeenCalledWith("устранено, подача восстановлена");
});
