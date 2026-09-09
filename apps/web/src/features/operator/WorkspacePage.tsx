import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useTranslation } from "@/app/i18n";
import { useAppeal } from "@/features/intake/api";
import { LoadingSkeleton } from "@/components/LoadingSkeleton";
import { CurrentAppealCol } from "./CurrentAppealCol";
import { SimilarCol } from "./SimilarCol";
import { DraftCol } from "./DraftCol";

export function WorkspacePage() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const { data: appeal, isLoading, isError } = useAppeal(id);
  const [draft, setDraft] = useState("");

  return (
    <div className="space-y-4">
      <Link to="/operator" className="text-sm text-primary underline">
        {t("operator.ws.back")}
      </Link>

      {isLoading && <LoadingSkeleton rows={8} />}
      {isError && <p className="text-sm text-muted-foreground">{t("operator.ws.notFound")}</p>}

      {appeal && (
        <div className="grid gap-4 lg:grid-cols-3">
          <CurrentAppealCol id={id} appeal={appeal} />
          <SimilarCol id={id} onUseResolution={setDraft} />
          <DraftCol appeal={appeal} initialDraft={draft} />
        </div>
      )}
    </div>
  );
}
