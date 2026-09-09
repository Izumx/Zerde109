import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
} from "@tanstack/react-table";
import { ChevronDown, ChevronUp, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/cn";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";

export interface SortState {
  id: string;
  desc: boolean;
}

interface Props<T> {
  columns: ColumnDef<T, unknown>[];
  data: T[];
  total?: number;
  page?: number;
  pageSize?: number;
  onPageChange?: (page: number) => void;
  sort?: SortState;
  onSortChange?: (s: SortState) => void;
  onRowClick?: (row: T) => void;
  isLoading?: boolean;
  density?: "comfortable" | "compact";
  emptyLabel?: string;
}

/** Серверная модель: сортировку/пагинацию наружу, сам не считает. */
export function DataTable<T>({
  columns,
  data,
  total,
  page = 1,
  pageSize = 50,
  onPageChange,
  sort,
  onSortChange,
  onRowClick,
  isLoading,
  density = "comfortable",
  emptyLabel = "Нет данных",
}: Props<T>) {
  const table = useReactTable({ data, columns, getCoreRowModel: getCoreRowModel() });
  const pad = density === "compact" ? "py-1.5" : "py-2.5";
  const pages = total !== undefined ? Math.max(1, Math.ceil(total / pageSize)) : undefined;

  return (
    <div className="space-y-3">
      <div className="overflow-x-auto rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((hg) => (
              <TableRow key={hg.id}>
                {hg.headers.map((h) => {
                  const canSort = Boolean(onSortChange) && h.column.columnDef.enableSorting !== false;
                  const active = sort?.id === h.column.id;
                  return (
                    <TableHead
                      key={h.id}
                      className={cn(canSort && "cursor-pointer select-none")}
                      onClick={
                        canSort
                          ? () => onSortChange?.({ id: h.column.id, desc: active ? !sort?.desc : true })
                          : undefined
                      }
                    >
                      <span className="inline-flex items-center gap-1">
                        {flexRender(h.column.columnDef.header, h.getContext())}
                        {canSort &&
                          (active ? (
                            sort?.desc ? (
                              <ChevronDown className="size-3.5" />
                            ) : (
                              <ChevronUp className="size-3.5" />
                            )
                          ) : (
                            <ChevronsUpDown className="size-3.5 opacity-40" />
                          ))}
                      </span>
                    </TableHead>
                  );
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={`sk-${i}`}>
                  {columns.map((__, j) => (
                    <TableCell key={j} className={pad}>
                      <Skeleton className="h-4 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : data.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="py-8 text-center text-muted-foreground">
                  {emptyLabel}
                </TableCell>
              </TableRow>
            ) : (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  className={cn(onRowClick && "cursor-pointer")}
                  onClick={() => onRowClick?.(row.original)}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id} className={pad}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {pages !== undefined && pages > 1 && (
        <div className="flex items-center justify-end gap-2 text-sm">
          <span className="text-muted-foreground">
            Стр. {page} из {pages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => onPageChange?.(page - 1)}
          >
            Назад
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= pages}
            onClick={() => onPageChange?.(page + 1)}
          >
            Вперёд
          </Button>
        </div>
      )}
    </div>
  );
}
