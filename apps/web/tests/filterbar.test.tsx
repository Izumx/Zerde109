import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { Providers } from "../src/app/providers";
import { makeRouter } from "../src/app/router";
import { stubMetaFetch } from "./_meta";

beforeEach(() => {
  localStorage.clear();
  stubMetaFetch();
});
afterEach(() => vi.restoreAllMocks());

async function renderShell(path = "/command-center") {
  const router = makeRouter([path]);
  render(<Providers router={router} />);
  // дождаться загрузки meta (регион-селект появляется после)
  await screen.findByLabelText("Регион");
  return router;
}

test("FilterBar shows region options from meta; picking one writes ?region=", async () => {
  const router = await renderShell();
  const select = screen.getByLabelText("Регион");
  expect(screen.getByRole("option", { name: "Акмолинская область" })).toBeInTheDocument();
  await userEvent.selectOptions(select, "akmola");
  expect(router.state.location.search).toContain("region=akmola");
});

test("period preset '30д' writes from/to into URL", async () => {
  const router = await renderShell();
  await userEvent.click(screen.getByRole("button", { name: "30 дней" }));
  expect(router.state.location.search).toMatch(/from=\d{4}-\d{2}-\d{2}/);
  expect(router.state.location.search).toMatch(/to=\d{4}-\d{2}-\d{2}/);
});

test("RoleSwitch to Оператор navigates to /operator", async () => {
  const router = await renderShell();
  await userEvent.click(screen.getByRole("button", { name: "Оператор" }));
  expect(router.state.location.pathname).toBe("/operator");
  expect(localStorage.getItem("zerde.role")).toBe("operator");
});
