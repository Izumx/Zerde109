import { Link } from "react-router-dom";
import { useTranslation } from "@/app/i18n";

export function NotFoundPage() {
  const { t } = useTranslation();
  return (
    <div className="space-y-3">
      <h1 className="text-2xl font-semibold">{t("notFound.title")}</h1>
      <Link to="/" className="text-primary underline">
        {t("notFound.home")}
      </Link>
    </div>
  );
}
