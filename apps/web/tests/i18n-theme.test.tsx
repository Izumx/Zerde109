import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { Providers } from "../src/app/providers";
import { makeRouter } from "../src/app/router";
import { ThemeProvider, useTheme } from "../src/app/theme";
import { stubMetaFetch } from "./_meta";

beforeEach(() => {
  localStorage.clear();
  document.documentElement.classList.remove("dark");
  stubMetaFetch();
});
afterEach(() => {
  localStorage.clear();
  vi.restoreAllMocks();
});

test("i18n: default RU, LangToggle to KK swaps nav strings and persists", async () => {
  render(<Providers router={makeRouter(["/command-center"])} />);
  expect(screen.getByRole("link", { name: "Ситуационный центр" })).toBeInTheDocument();

  await userEvent.click(screen.getByRole("button", { name: "kk" }));

  expect(await screen.findByRole("link", { name: "Жағдайлық орталық" })).toBeInTheDocument();
  expect(localStorage.getItem("zerde.lang")).toBe("kk");
});

function ThemeProbe() {
  const { resolved, setTheme } = useTheme();
  return (
    <div>
      <span data-testid="resolved">{resolved}</span>
      <button onClick={() => setTheme("dark")}>dark</button>
      <button onClick={() => setTheme("light")}>light</button>
    </div>
  );
}

test("theme: setTheme toggles the `dark` class on <html> and persists", async () => {
  render(
    <ThemeProvider>
      <ThemeProbe />
    </ThemeProvider>,
  );
  expect(document.documentElement.classList.contains("dark")).toBe(false);

  await userEvent.click(screen.getByRole("button", { name: "dark" }));
  expect(document.documentElement.classList.contains("dark")).toBe(true);
  expect(localStorage.getItem("zerde.theme")).toBe("dark");

  await userEvent.click(screen.getByRole("button", { name: "light" }));
  expect(document.documentElement.classList.contains("dark")).toBe(false);
  expect(localStorage.getItem("zerde.theme")).toBe("light");
});
