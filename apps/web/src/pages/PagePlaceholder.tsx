interface Props {
  title: string;
  plan: number;
  extra?: React.ReactNode;
}

/** Заглушка экрана модуля. В Task 10 обогащается блоком «данные подключены». */
export function PagePlaceholder({ title, plan, extra }: Props) {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">{title}</h1>
      <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
        Модуль в разработке — План {plan}
      </div>
      {extra}
    </div>
  );
}
