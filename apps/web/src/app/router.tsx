import {
  createBrowserRouter,
  createMemoryRouter,
  Navigate,
  type RouteObject,
} from "react-router-dom";
import { AppShell } from "./shell";
import { CommandCenterPage } from "@/pages/CommandCenterPage";
import { IntakePage } from "@/pages/IntakePage";
import { OperatorPage } from "@/pages/OperatorPage";
import { AppealDetailPage } from "@/pages/AppealDetailPage";
import { NotFoundPage } from "@/pages/NotFoundPage";

/** Task 6 заменит на реальную роль из useRole(). */
function RoleRedirect() {
  return <Navigate to="/command-center" replace />;
}

const routes: RouteObject[] = [
  {
    element: <AppShell />,
    children: [
      { path: "/", element: <RoleRedirect /> },
      { path: "/command-center", element: <CommandCenterPage /> },
      { path: "/intake", element: <IntakePage /> },
      { path: "/operator", element: <OperatorPage /> },
      { path: "/appeals/:id", element: <AppealDetailPage /> },
      { path: "*", element: <NotFoundPage /> },
    ],
  },
];

const future = { v7_startTransition: true, v7_relativeSplatPath: true } as const;

export const router = createBrowserRouter(routes, { future });

/** Для тестов: роутер в памяти с произвольной стартовой точкой. */
export const makeRouter = (initialEntries: string[] = ["/"]) =>
  createMemoryRouter(routes, { initialEntries, future });
