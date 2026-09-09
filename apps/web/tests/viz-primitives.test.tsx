import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, test, vi } from "vitest";
import { I18nProvider } from "../src/app/i18n";
import { KpiCard } from "../src/components/KpiCard";
import { RankedBarList } from "../src/components/RankedBarList";
import { ChartCard } from "../src/components/ChartCard";

const wrap = (ui: React.ReactNode) => render(<I18nProvider>{ui}</I18nProvider>);

test("KpiCard shows a negative delta as −20% with 'down' direction", () => {
  wrap(<KpiCard label="Всего" value="1 234" delta={-0.2} />);
  const badge = screen.getByText(/20%/);
  expect(badge.textContent).toContain("−20%");
  expect(badge.closest("[data-direction]")?.getAttribute("data-direction")).toBe("down");
});

test("RankedBarList renders a row per item and fires onItemClick", async () => {
  const onItemClick = vi.fn();
  wrap(
    <RankedBarList
      items={[
        { key: "a", label: "Альфа", value: 10 },
        { key: "b", label: "Бета", value: 4 },
        { key: "c", label: "Гамма", value: 1 },
      ]}
      onItemClick={onItemClick}
    />,
  );
  expect(screen.getAllByRole("listitem")).toHaveLength(3);
  await userEvent.click(screen.getByText("Бета"));
  expect(onItemClick).toHaveBeenCalledWith("b");
});

test("ChartCard error state shows retry; click calls onRetry", async () => {
  const onRetry = vi.fn();
  wrap(
    <ChartCard title="Динамика" isError onRetry={onRetry}>
      <div>chart</div>
    </ChartCard>,
  );
  expect(screen.queryByText("chart")).not.toBeInTheDocument();
  await userEvent.click(screen.getByRole("button", { name: "Повторить" }));
  expect(onRetry).toHaveBeenCalled();
});

test("ChartCard 'show table' toggle swaps children for tableSlot", async () => {
  wrap(
    <ChartCard title="Динамика" tableSlot={<div>таблица</div>}>
      <div>график</div>
    </ChartCard>,
  );
  expect(screen.getByText("график")).toBeInTheDocument();
  await userEvent.click(screen.getByRole("button", { name: "Показать таблицей" }));
  expect(screen.getByText("таблица")).toBeInTheDocument();
  expect(screen.queryByText("график")).not.toBeInTheDocument();
});
