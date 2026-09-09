import { useParams } from "react-router-dom";
import { PagePlaceholder } from "./PagePlaceholder";

export function AppealDetailPage() {
  const { id } = useParams<{ id: string }>();
  return (
    <PagePlaceholder
      titleKey="nav.intake"
      plan={5}
      extra={<p className="text-sm text-muted-foreground">ID: {id}</p>}
    />
  );
}
