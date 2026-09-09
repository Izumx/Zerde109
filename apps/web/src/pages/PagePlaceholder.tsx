import type { ReactNode } from "react";
import { useTranslation } from "@/app/i18n";
import { useMeta } from "@/lib/useMeta";

interface Props {
  titleKey: string;
  plan: number;
  extra?: ReactNode;
}

/** Заглушка экрана модуля. Блок «данные подключены» доказывает связь фронт→API→БД. */
export function PagePlaceholder({ titleKey, plan, extra }: Props) {
  const { t } = useTranslation();
  const { data, isLoading, isError } = useMeta();

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">{t(titleKey)}</h1>
      <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
        {t("placeholder.inDevelopment", { plan })}
      </div>
      <p className="text-xs text-muted-foreground">
        {isLoading
          ? t("common.loading")
          : isError
            ? t("common.error")
            : data
              ? t("placeholder.dataConnected", {
                  regions: data.regions.length,
                  themes: data.themes.length,
                })
              : null}
      </p>
      {extra}
    </div>
  );
}
