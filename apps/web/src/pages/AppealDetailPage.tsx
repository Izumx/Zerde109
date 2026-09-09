import { useParams } from "react-router-dom";
import { PagePlaceholder } from "./PagePlaceholder";

export function AppealDetailPage() {
  const { id } = useParams<{ id: string }>();
  return <PagePlaceholder title={`Обращение ${id ?? ""}`} plan={5} />;
}
