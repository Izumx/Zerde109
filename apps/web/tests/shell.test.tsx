import { render, screen } from "@testing-library/react";
import { RouterProvider } from "react-router-dom";
import { QueryClientProvider } from "@tanstack/react-query";
import { expect, test } from "vitest";
import { makeRouter } from "../src/app/router";
import { makeQueryClient } from "../src/lib/queryClient";

function renderAt(path: string) {
  const qc = makeQueryClient();
  const router = makeRouter([path]);
  return render(
    <QueryClientProvider client={qc}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
}

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
