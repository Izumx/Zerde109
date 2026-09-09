import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { Providers } from "../src/app/providers";
import { makeRouter } from "../src/app/router";
import { META_FIXTURE } from "./_meta";

beforeEach(() => {
  localStorage.clear();
  vi.stubGlobal(
    "fetch",
    vi.fn((input: RequestInfo | URL) => {
      const url = String(input);
      let body: unknown = {};
      if (url.includes("/api/meta")) body = META_FIXTURE;
      else if (url.includes("/api/appeals")) body = { items: [], page: 1, pageSize: 50, total: 0 };
      return Promise.resolve(
        new Response(JSON.stringify(body), { status: 200, headers: { "content-type": "application/json" } }),
      );
    }),
  );
});
afterEach(() => vi.restoreAllMocks());

test("/intake shows 3 tabs; switching to Демо-классификация reveals a textarea", async () => {
  render(<Providers router={makeRouter(["/intake"])} />);
  const tabs = await screen.findAllByRole("tab");
  expect(tabs).toHaveLength(3);

  await userEvent.click(screen.getByRole("tab", { name: "Демо-классификация" }));
  expect(await screen.findByRole("textbox")).toBeInTheDocument();
});
