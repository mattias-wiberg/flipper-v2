"use client";

import {
  type ColumnFiltersState,
  flexRender,
  useTable,
  type RowData,
  type RowSelectionState,
  type SortingState,
  type ColumnVisibilityState,
} from "@tanstack/react-table";
import * as React from "react";

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { ChevronRight, Info } from "lucide-react";
import { DealExpandedRow } from "./data-table-expanded-row";

import { DealOrderCounts } from "@/lib/deals";
import Link from "next/link";
import { DataTablePagination } from "./data-table-pagination";
import { DataTableToolbar } from "./data-table-toolbar";
import { dealTableFeatures, type DealColumnDef } from "./data-table-config";

interface DataTableProps<TData extends RowData> {
  columns: DealColumnDef<TData>[];
  data: TData[];
  counts: DealOrderCounts;
}

export function DataTable<TData extends RowData>({
  columns,
  data,
  counts,
}: DataTableProps<TData>) {
  const [rowSelection, setRowSelection] = React.useState<RowSelectionState>({});
  const [columnVisibility, setColumnVisibility] =
    React.useState<ColumnVisibilityState>({});
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
    [],
  );
  const [sorting, setSorting] = React.useState<SortingState>([]);

  const [expandedRows, setExpandedRows] = React.useState<
    Record<string, boolean>
  >({});

  const handleToggleRow = (rowId: string, open: boolean) => {
    setExpandedRows((prev) => ({ ...prev, [rowId]: open }));
  };

  const table = useTable({
    features: dealTableFeatures,
    data,
    columns,
    state: {
      sorting,
      columnVisibility,
      rowSelection,
      columnFilters,
    },
    initialState: {
      pagination: {
        pageIndex: 0,
        pageSize: 25,
      },
    },
    enableRowSelection: true,
    onRowSelectionChange: setRowSelection,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
  });

  return (
    <div className="flex flex-col gap-4 w-full">
      <DataTableToolbar table={table} />
      <div className="overflow-hidden rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {/* Add an extra header for the expand/collapse icon */}
                <TableHead className="w-8" />
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id} colSpan={header.colSpan}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext(),
                        )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          {table.getRowModel().rows?.length ? (
            table.getRowModel().rows.map((row) => {
              const isOpen = !!expandedRows[row.id];
              return (
                <Collapsible
                  key={row.id}
                  open={isOpen}
                  onOpenChange={(open) => handleToggleRow(row.id, open)}
                  render={<TableBody />}
                >
                  <TableRow data-state={row.getIsSelected() && "selected"}>
                    <TableCell className="w-8 p-0 align-middle">
                      <CollapsibleTrigger
                        render={
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-8"
                            aria-label={isOpen ? "Collapse row" : "Expand row"}
                          />
                        }
                      >
                        <ChevronRight
                          aria-hidden="true"
                          className={cn(
                            "transition-transform",
                            isOpen && "rotate-90",
                          )}
                        />
                      </CollapsibleTrigger>
                    </TableCell>
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id}>
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext(),
                        )}
                      </TableCell>
                    ))}
                  </TableRow>
                  <CollapsibleContent
                    render={<TableRow className="bg-muted/20" />}
                  >
                    <TableCell colSpan={columns.length + 1} className="py-0">
                      <DealExpandedRow row={row} />
                    </TableCell>
                  </CollapsibleContent>
                </Collapsible>
              );
            })
          ) : (
            <TableBody>
              <TableRow>
                <TableCell
                  colSpan={columns.length + 1}
                  className="h-24 text-center"
                >
                  <div className="flex flex-col items-center justify-center gap-2 py-10">
                    <Info className="size-10" />
                    <div className="flex flex-col items-center gap-5">
                      No deals were found with your current data, flip settings
                      and table filters.
                      <div className="text-muted-foreground">
                        To get started, go to the{" "}
                        <Link href="/authenticated/token" className="underline">
                          token page
                        </Link>{" "}
                        and scan your market data using the{" "}
                        <Link
                          href="https://www.albion-online-data.com/"
                          className="underline"
                        >
                          Albion Data Client
                        </Link>
                        .
                      </div>
                    </div>
                  </div>
                </TableCell>
              </TableRow>
            </TableBody>
          )}
        </Table>
      </div>
      <DataTablePagination table={table} counts={counts} />
    </div>
  );
}
