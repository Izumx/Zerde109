import type { ReactNode } from "react";
import { Inbox } from "lucide-react";
import { useTranslation } from "@/app/i18n";

interface Props {
  title?: string;
  hint?: string;
  icon?: ReactNode;
}

export function EmptyState({ title, hint, icon }: Props) {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-10 text-center text-muted-foreground">
      <span aria-hidden>{icon ?? <Inbox className="size-6 opacity-50" />}</span>
      <span className="text-sm">{title ?? t("common.empty")}</span>
      {hint && <span className="text-xs">{hint}</span>}
    </div>
  );
}
