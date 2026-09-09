import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { ErrorBoundary } from "../src/components/ErrorBoundary";

function Boom({ crash }: { crash: boolean }) {
  if (crash) throw new Error("бум");
  return <div>ок</div>;
}

function Harness() {
  const [crash, setCrash] = useState(true);
  return (
    <div>
      <button onClick={() => setCrash(false)}>fix</button>
      <ErrorBoundary>
        <Boom crash={crash} />
      </ErrorBoundary>
    </div>
  );
}

let errSpy: ReturnType<typeof vi.spyOn>;
beforeEach(() => {
  errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
});
afterEach(() => errSpy.mockRestore());

test("catches a render error and shows fallback + Обновить", () => {
  render(
    <ErrorBoundary>
      <Boom crash />
    </ErrorBoundary>,
  );
  expect(screen.getByRole("heading", { name: "Что-то пошло не так" })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Обновить" })).toBeInTheDocument();
});

test("Обновить resets and re-renders children once the prop is fixed", async () => {
  render(<Harness />);
  expect(screen.getByRole("heading", { name: "Что-то пошло не так" })).toBeInTheDocument();
  await userEvent.click(screen.getByRole("button", { name: "fix" }));
  await userEvent.click(screen.getByRole("button", { name: "Обновить" }));
  expect(screen.getByText("ок")).toBeInTheDocument();
});
