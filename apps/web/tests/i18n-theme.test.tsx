import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, expect, test } from "vitest";
import { Providers } from "../src/app/providers";
import { makeRouter } from "../src/app/router";

beforeEach(() => localStorage.clear());
afterEach(() => localStorage.clear());

const renderShell = (path = "/command-center") =>
  render(<Providers router={makeRouter([path])} />);

test("i18n: default RU, LangToggle to KK swaps nav strings and persists", async () => {
  renderShell();
  expect(screen.getByRole("link", { name: "Ситуационный центр" })).toBeInTheDocument();

  await userEvent.click(screen.getByRole("button", { name: "kk" }));

  expect(await screen.findByRole("link", { name: "Жағдайлық орталық" })).toBeInTheDocument();
  expect(localStorage.getItem("zerde.lang")).toBe("kk");
});
