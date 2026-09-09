import { useState } from "react";
import { NavLink, Outlet } from "react-router-dom";
import { Menu } from "lucide-react";
import { cn } from "@/lib/cn";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/app/i18n";
import { LangToggle } from "@/components/LangToggle";
import { ThemeToggle } from "@/components/ThemeToggle";

const NAV = [
  { to: "/command-center", key: "nav.commandCenter" },
  { to: "/intake", key: "nav.intake" },
  { to: "/operator", key: "nav.operator" },
];

/**
 * Оболочка приложения. Слоты topbar (FilterBar / RoleSwitch / LangToggle /
 * ThemeToggle) наполняются в Tasks 4–6.
 */
export function AppShell() {
  const [navOpen, setNavOpen] = useState(false);
  const { t } = useTranslation();

  return (
    <div className="flex min-h-screen flex-col">
      <header className="flex flex-wrap items-center gap-3 border-b bg-card px-4 py-2">
        <Button
          variant="ghost"
          size="icon"
          className="lg:hidden"
          aria-label="Меню"
          onClick={() => setNavOpen((v) => !v)}
        >
          <Menu className="size-5" />
        </Button>
        <span className="font-semibold text-primary">Zerde&nbsp;109</span>
        <div data-slot="filterbar" className="flex flex-1 flex-wrap items-center gap-2" />
        <div data-slot="toolbar" className="flex items-center gap-2">
          <LangToggle />
          <ThemeToggle />
        </div>
      </header>

      <div className="flex flex-1">
        <aside
          className={cn(
            "w-56 shrink-0 border-r bg-card p-3 lg:block",
            navOpen ? "block" : "hidden",
          )}
        >
          <nav className="flex flex-col gap-1 text-sm">
            {NAV.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={() => setNavOpen(false)}
                className={({ isActive }) =>
                  cn(
                    "rounded-md px-3 py-2 transition-colors",
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : "text-foreground hover:bg-accent",
                  )
                }
              >
                {t(item.key)}
              </NavLink>
            ))}
          </nav>
        </aside>

        <main className="flex-1 p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
