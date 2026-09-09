import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import type { Appeal } from "@zerde/types";
import { I18nProvider } from "../src/app/i18n";
import { makeQueryClient } from "../src/lib/queryClient";
import { DraftCol } from "../src/features/operator/DraftCol";
import { META_FIXTURE } from "./_meta";

const APPEAL = {
  id: "akmola:1",
  sourceId: "051125-000-037",
  region: "akmola",
  district: null, locality: null, address: "ул. Абая 5",
  lat: null, lon: null,
  createdAt: "2025-11-05T07:34:46.138Z",
  closedAt: null, deadlineAt: null,
  theme: "water",
  rawCategory: "Отсутствие воды", subcategory: null, serviceOrg: null,
  status: "routed", rawStatus: null, appealType: "incident", channel: "ekc109",
  language: "ru", priority: "high", isOverdue: false,
  slaDays: null, grade: null, operator: null, resolution: null, searchText: "",
} satisfies Appeal;

let calls: { url: string; body?: string }[] = [];

beforeEach(() => {
  calls = [];
  vi.stubGlobal(
    "fetch",
    vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      calls.push({ url, body: init?.body as string | undefined });
      let body: unknown = {};
      if (url.includes("/api/meta")) body = META_FIXTURE;
      else if (url.includes("/duplicates")) body = { nearDuplicates: [], repeats: [{ id: "y", preview: "старое" }] };
      else if (url.includes("/templates"))
        body = [{ id: 1, themeCode: "water", serviceCode: "vodokanal", lang: "ru", title: "Вода", body: "Заявка по адресу {address} направлена." }];
      else if (url.includes("/route")) body = { id: 7 };
      return Promise.resolve(
        new Response(JSON.stringify(body), { status: 200, headers: { "content-type": "application/json" } }),
      );
    }),
  );
});
afterEach(() => vi.restoreAllMocks());

const render_ = () =>
  render(
    <QueryClientProvider client={makeQueryClient()}>
      <I18nProvider>
        <MemoryRouter>
          <DraftCol appeal={APPEAL} />
        </MemoryRouter>
      </I18nProvider>
    </QueryClientProvider>,
  );

test("shows 'Повторное' badge, applies a template, routes", async () => {
  render_();
  expect(await screen.findByText(/Повторное/)).toBeInTheDocument();

  await userEvent.selectOptions(screen.getByLabelText("Типовой ответ"), "1");
  expect((screen.getByRole("textbox") as HTMLTextAreaElement).value).toContain(
    "Заявка по адресу ул. Абая 5 направлена.",
  );

  await userEvent.click(screen.getByRole("button", { name: "Маршрутизировать" }));
  await vi.waitFor(() => {
    const routeCall = calls.find((c) => c.url.includes("/route"));
    expect(routeCall?.body).toContain('"kind":"route"');
  });
});
