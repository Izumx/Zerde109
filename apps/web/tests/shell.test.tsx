import { render, screen } from "@testing-library/react";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { Providers } from "../src/app/providers";
import { makeRouter } from "../src/app/router";
import { stubMetaFetch } from "./_meta";

beforeEach(() => {
  localStorage.clear();
  stubMetaFetch();
});
afterEach(() => vi.restoreAllMocks());

const renderAt = (path: string) => render(<Providers router={makeRouter([path])} />);

test("shell renders nav links", () => {
  renderAt("/command-center");
  expect(screen.getByRole("link", { name: "Ситуационный центр" })).toBeInTheDocument();
  expect(screen.getByRole("link", { name: "Смарт-приём" })).toBeInTheDocument();
  expect(screen.getByRole("link", { name: "Ассистент оператора" })).toBeInTheDocument();
});

test("'/' redirects to command centre", () => {
  renderAt("/");
  expect(screen.getByRole("heading", { name: "Ситуационный центр" })).toBeInTheDocument();
});

test("unknown route shows not-found", () => {
  renderAt("/zzz-nope");
  expect(screen.getByRole("heading", { name: "Страница не найдена" })).toBeInTheDocument();
});
