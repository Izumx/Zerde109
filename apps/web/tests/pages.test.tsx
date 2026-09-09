import { render, screen } from "@testing-library/react";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { I18nProvider } from "../src/app/i18n";
import { makeQueryClient } from "../src/lib/queryClient";
import { IntakePage } from "../src/pages/IntakePage";
import { META_FIXTURE, stubMetaFetch } from "./_meta";

beforeEach(() => stubMetaFetch());
afterEach(() => vi.restoreAllMocks());

test("IntakePage (placeholder): title + in-development note + data-connected line", async () => {
  render(
    <QueryClientProvider client={makeQueryClient()}>
      <I18nProvider>
        <MemoryRouter>
          <IntakePage />
        </MemoryRouter>
      </I18nProvider>
    </QueryClientProvider>,
  );

  expect(screen.getByRole("heading", { name: "Смарт-приём" })).toBeInTheDocument();
  expect(screen.getByText(/Модуль в разработке — План 5/)).toBeInTheDocument();

  const line = await screen.findByText(/Данные подключены/);
  expect(line.textContent).toContain(String(META_FIXTURE.regions.length));
  expect(line.textContent).toContain(String(META_FIXTURE.themes.length));
});
