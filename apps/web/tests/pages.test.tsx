import { render, screen } from "@testing-library/react";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { I18nProvider } from "../src/app/i18n";
import { makeQueryClient } from "../src/lib/queryClient";
import { CommandCenterPage } from "../src/pages/CommandCenterPage";
import { META_FIXTURE, stubMetaFetch } from "./_meta";

beforeEach(() => stubMetaFetch());
afterEach(() => vi.restoreAllMocks());

test("CommandCenterPage: title + in-development note + data-connected line from /api/meta", async () => {
  render(
    <QueryClientProvider client={makeQueryClient()}>
      <I18nProvider>
        <MemoryRouter>
          <CommandCenterPage />
        </MemoryRouter>
      </I18nProvider>
    </QueryClientProvider>,
  );

  expect(screen.getByRole("heading", { name: "Ситуационный центр" })).toBeInTheDocument();
  expect(screen.getByText(/Модуль в разработке — План 4/)).toBeInTheDocument();

  const line = await screen.findByText(/Данные подключены/);
  expect(line.textContent).toContain(String(META_FIXTURE.regions.length));
  expect(line.textContent).toContain(String(META_FIXTURE.themes.length));
});
