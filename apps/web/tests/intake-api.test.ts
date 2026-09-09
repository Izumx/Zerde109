import { renderHook, waitFor } from "@testing-library/react";
import { QueryClientProvider } from "@tanstack/react-query";
import { createElement, type ReactNode } from "react";
import { afterEach, expect, test, vi } from "vitest";
import type { ApiError } from "../src/lib/api";
import { makeQueryClient } from "../src/lib/queryClient";
import { useAppeals, useModelEval } from "../src/features/intake/api";

const wrapper = ({ children }: { children: ReactNode }) =>
  createElement(QueryClientProvider, { client: makeQueryClient() }, children);

afterEach(() => vi.restoreAllMocks());

test("useAppeals returns paginated data", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn(() =>
      Promise.resolve(
        new Response(JSON.stringify({ items: [{ id: "a" }], page: 1, pageSize: 50, total: 1 }), {
          status: 200,
          headers: { "content-type": "application/json" },
        }),
      ),
    ),
  );
  const { result } = renderHook(
    () => useAppeals({ sort: "created_desc", page: 1, pageSize: 50 }),
    { wrapper },
  );
  await waitFor(() => expect(result.current.data?.total).toBe(1));
});

test("useModelEval surfaces a 404 as not_found without retrying forever", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn(() =>
      Promise.resolve(
        new Response(JSON.stringify({ error: { code: "not_found", message: "no eval" } }), {
          status: 404,
          headers: { "content-type": "application/json" },
        }),
      ),
    ),
  );
  const { result } = renderHook(() => useModelEval(), { wrapper });
  await waitFor(() => expect(result.current.isError).toBe(true));
  expect((result.current.error as ApiError).code).toBe("not_found");
});
