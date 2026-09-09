import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, test, vi } from "vitest";
import type { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "../src/components/DataTable";

interface Row {
  id: string;
  name: string;
  n: number;
}
const columns: ColumnDef<Row, unknown>[] = [
  { id: "name", header: "Имя", accessorKey: "name" },
  { id: "n", header: "Число", accessorKey: "n" },
];
const data: Row[] = [
  { id: "a", name: "Альфа", n: 1 },
  { id: "b", name: "Бета", n: 2 },
  { id: "c", name: "Гамма", n: 3 },
  { id: "d", name: "Дельта", n: 4 },
];

test("renders a row per datum", () => {
  render(<DataTable columns={columns} data={data} />);
  expect(screen.getByText("Альфа")).toBeInTheDocument();
  expect(screen.getAllByRole("row")).toHaveLength(1 + data.length); // header + 4
});

test("row click passes the original datum", async () => {
  const onRowClick = vi.fn();
  render(<DataTable columns={columns} data={data} onRowClick={onRowClick} />);
  await userEvent.click(screen.getByText("Бета"));
  expect(onRowClick).toHaveBeenCalledWith(data[1]);
});

test("header click emits sort state when onSortChange is provided", async () => {
  const onSortChange = vi.fn();
  render(<DataTable columns={columns} data={data} onSortChange={onSortChange} />);
  await userEvent.click(screen.getByText("Число"));
  expect(onSortChange).toHaveBeenCalledWith({ id: "n", desc: true });
});

test("isLoading shows skeleton rows, no data rows", () => {
  render(<DataTable columns={columns} data={[]} isLoading />);
  expect(screen.queryByText("Альфа")).not.toBeInTheDocument();
  expect(screen.getAllByRole("row").length).toBeGreaterThan(1);
});

test("empty data shows the empty label", () => {
  render(<DataTable columns={columns} data={[]} emptyLabel="Пусто" />);
  expect(screen.getByText("Пусто")).toBeInTheDocument();
});
