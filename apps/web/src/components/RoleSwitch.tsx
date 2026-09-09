import { useNavigate } from "react-router-dom";
import { useTranslation } from "@/app/i18n";
import { useRole, defaultRouteForRole, type Role } from "@/lib/useRole";
import { cn } from "@/lib/cn";

const ROLES: Role[] = ["director", "operator"];

export function RoleSwitch() {
  const { t } = useTranslation();
  const { role, setRole } = useRole();
  const navigate = useNavigate();

  return (
    <div className="inline-flex overflow-hidden rounded-md border text-xs">
      {ROLES.map((r) => (
        <button
          key={r}
          type="button"
          onClick={() => {
            setRole(r);
            navigate(defaultRouteForRole(r));
          }}
          className={cn(
            "px-2.5 py-1 transition-colors",
            role === r ? "bg-primary text-primary-foreground" : "hover:bg-accent",
          )}
        >
          {t(`role.${r}`)}
        </button>
      ))}
    </div>
  );
}
