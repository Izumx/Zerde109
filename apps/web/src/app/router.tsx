import {
  createBrowserRouter,
  createMemoryRouter,
  Navigate,
  type RouteObject,
} from "react-router-dom";
import { AppShell } from "./shell";
import { useRole, defaultRouteForRole } from "@/lib/useRole";
import { CommandCenterPage } from "@/pages/CommandCenterPage";
import { IntakePage } from "@/pages/IntakePage";
import { OperatorPage } from "@/pages/OperatorPage";
import { AppealDetailPage } from "@/pages/AppealDetailPage";
import { NotFoundPage } from "@/pages/NotFoundPage";

function RoleRedirect() {
  const { role } = useRole();
  return <Navigate to={defaultRouteForRole(role)} replace />;
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
