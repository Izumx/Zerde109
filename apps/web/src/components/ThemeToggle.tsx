import { Moon, Sun, Laptop } from "lucide-react";
import { useTheme, type ThemeChoice } from "@/app/theme";
import { useTranslation } from "@/app/i18n";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const ITEMS: { value: ThemeChoice; icon: typeof Sun; key: string }[] = [
  { value: "light", icon: Sun, key: "theme.light" },
  { value: "dark", icon: Moon, key: "theme.dark" },
  { value: "system", icon: Laptop, key: "theme.system" },
];

export function ThemeToggle() {
  const { theme, resolved, setTheme } = useTheme();
  const { t } = useTranslation();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label={t("theme.label")}>
          {resolved === "dark" ? <Moon className="size-4" /> : <Sun className="size-4" />}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {ITEMS.map(({ value, icon: Icon, key }) => (
          <DropdownMenuItem
            key={value}
            onClick={() => setTheme(value)}
            data-active={theme === value}
          >
            <Icon className="mr-2 size-4" />
            {t(key)}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
