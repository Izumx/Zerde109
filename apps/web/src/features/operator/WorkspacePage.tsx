import { useParams } from "react-router-dom";

// Полная сборка — Task 6.
export function WorkspacePage() {
  const { id } = useParams<{ id: string }>();
  return <div className="text-sm text-muted-foreground">Рабочий экран оператора: {id}</div>;
}
