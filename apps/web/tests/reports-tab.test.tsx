import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { I18nProvider } from "../src/app/i18n";
import { makeQueryClient } from "../src/lib/queryClient";
import { ReportsTab } from "../src/features/command-center/ReportsTab";

let clickSpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  vi.stubGlobal(
    "fetch",
    vi.fn(() =>
      Promise.resolve(
        new Response(new Blob(["PK.."], { type: "application/octet-stream" }), { status: 200 }),
      ),
    ),
  );
  vi.stubGlobal("URL", {
    ...URL,
    createObjectURL: vi.fn(() => "blob:mock"),
    revokeObjectURL: vi.fn(),
  });
  clickSpy = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
});
afterEach(() => vi.restoreAllMocks());

test("clicking 'Скачать XLSX' triggers a download with .xlsx filename", async () => {
  render(
    <QueryClientProvider client={makeQueryClient()}>
      <I18nProvider>
        <MemoryRouter>
          <ReportsTab />
        </MemoryRouter>
      </I18nProvider>
    </QueryClientProvider>,
  );
  await userEvent.click(screen.getByRole("button", { name: /Скачать XLSX/ }));

  await vi.waitFor(() => expect(clickSpy).toHaveBeenCalled());
  expect((URL.createObjectURL as ReturnType<typeof vi.fn>)).toHaveBeenCalled();
  const anchor = clickSpy.mock.instances[0] as HTMLAnchorElement;
  expect(anchor.download).toMatch(/\.xlsx$/);
});
