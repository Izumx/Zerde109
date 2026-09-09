import { useState, type ReactNode } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { makeQueryClient } from "@/lib/queryClient";
import { Toaster } from "@/components/ui/sonner";
import { I18nProvider } from "./i18n";
import { router as browserRouter } from "./router";

type AppRouter = ReturnType<typeof createBrowserRouter>;

/**
 * Провайдеры приложения. Theme / i18n добавляются в Tasks 4–5.
 * `router` можно подменить (тесты передают memory-router).
 */
export function Providers({ router = browserRouter }: { router?: AppRouter }) {
  const [queryClient] = useState(makeQueryClient);

  return (
    <QueryClientProvider client={queryClient}>
      <I18nProvider>
        <RouterProvider router={router} future={{ v7_startTransition: true }} />
        <Toaster />
      </I18nProvider>
    </QueryClientProvider>
  );
}

/** Обёртка для тестов компонентов вне роутера. */
export function TestQueryProvider({ children }: { children: ReactNode }) {
  const [queryClient] = useState(makeQueryClient);
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
