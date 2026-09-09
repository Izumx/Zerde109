import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClientProvider } from "@tanstack/react-query";
import { afterEach, expect, test, vi } from "vitest";
import { I18nProvider } from "../src/app/i18n";
import { makeQueryClient } from "../src/lib/queryClient";
import { NlQueryTab } from "../src/features/command-center/NlQueryTab";

afterEach(() => vi.restoreAllMocks());

const render_ = () =>
  render(
    <QueryClientProvider client={makeQueryClient()}>
      <I18nProvider>
        <NlQueryTab />
      </I18nProvider>
    </QueryClientProvider>,
  );

test("submits a question and renders value + summary + SQL disclosure", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn(() =>
      Promise.resolve(
        new Response(
          JSON.stringify({
            intent: "count_by_theme_region_period",
            sql: "SELECT count(*) FROM appeals WHERE theme=$1",
            value: 42,
            rows: [],
            chart: null,
            summary: "42 обращения по дорогам",
          }),
          { status: 200, headers: { "content-type": "application/json" } },
        ),
      ),
    ),
  );
  render_();
  await userEvent.type(screen.getByPlaceholderText(/естественном языке/), "сколько по дорогам");
  await userEvent.click(screen.getByRole("button", { name: "Спросить" }));

  expect(await screen.findByText("42")).toBeInTheDocument();
  expect(screen.getByText("42 обращения по дорогам")).toBeInTheDocument();
  await userEvent.click(screen.getByText("Показать SQL"));
  expect(screen.getByText(/SELECT count\(\*\) FROM appeals/)).toBeInTheDocument();
});

test("422 unrecognized_query shows the message", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn(() =>
      Promise.resolve(
        new Response(
          JSON.stringify({ error: { code: "unrecognized_query", message: "Не понял запрос" } }),
          { status: 422, headers: { "content-type": "application/json" } },
        ),
      ),
    ),
  );
  render_();
  await userEvent.click(screen.getAllByRole("button")[1]!); // первый чипс
  expect(await screen.findByText(/Не понял запрос/)).toBeInTheDocument();
});
