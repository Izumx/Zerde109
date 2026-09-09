import { renderHook, waitFor } from "@testing-library/react";
import { QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { createElement, type ReactNode } from "react";
import { afterEach, expect, test, vi } from "vitest";
import { makeQueryClient } from "../src/lib/queryClient";
import { useSimilar } from "../src/features/operator/api";

const wrapper = ({ children }: { children: ReactNode }) =>
  createElement(
    QueryClientProvider,
    { client: makeQueryClient() },
    createElement(MemoryRouter, null, children),
  );

afterEach(() => vi.restoreAllMocks());

test("useSimilar is idle without an id, fetches with one", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn(() =>
      Promise.resolve(
        new Response(JSON.stringify([{ id: "x", similarity: 0.8 }]), {
          status: 200,
          headers: { "content-type": "application/json" },
        }),
      ),
    ),
  );

  const idle = renderHook(() => useSimilar(undefined), { wrapper });
  expect(idle.result.current.fetchStatus).toBe("idle");

  const { result } = renderHook(() => useSimilar("akmola:1"), { wrapper });
  await waitFor(() => expect(result.current.data?.length).toBe(1));
});
