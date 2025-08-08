"use client";

import {
  ColumnDef,
  ColumnFiltersState,
  flexRender,
  getCoreRowModel,
  getFacetedRowModel,
  getFacetedUniqueValues,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  SortingState,
  useReactTable,
  VisibilityState,
} from "@tanstack/react-table";
import * as React from "react";

import { Collapsible, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ChevronRight, Info } from "lucide-react";
import { DealExpandedRow } from "./data-table-expanded-row";

import { DealOrderCounts } from "@/lib/deals";
import Link from "next/link";
import { DataTablePagination } from "./data-table-pagination";
import { DataTableToolbar } from "./data-table-toolbar";

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  counts: DealOrderCounts;
}

export function DataTable<TData, TValue>({
  columns,
  data,
  counts,
}: DataTableProps<TData, TValue>) {
  const [rowSelection, setRowSelection] = React.useState({});
  const [columnVisibility, setColumnVisibility] =
    React.useState<VisibilityState>({});
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
    []
  );
  const [sorting, setSorting] = React.useState<SortingState>([]);

  // New: manage expanded rows state at the top level
  const [expandedRows, setExpandedRows] = React.useState<
    Record<string, boolean>
  >({});

  const handleToggleRow = (rowId: string) => {
    setExpandedRows((prev) => ({ ...prev, [rowId]: !prev[rowId] }));
  };

  const table = useReactTable({
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
        pageSize: 25,
      },
    },
    enableRowSelection: true,
    onRowSelectionChange: setRowSelection,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFacetedRowModel: getFacetedRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
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
                          header.getContext()
                        )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.flatMap((row) => {
                const isOpen = !!expandedRows[row.id];
                return [
                  <Collapsible
                    key={row.id + "-collapsible"}
                    open={isOpen}
                    onOpenChange={() => handleToggleRow(row.id)}
                    asChild
                  >
                    <CollapsibleTrigger asChild>
                      <TableRow
                        data-state={row.getIsSelected() && "selected"}
                        className="cursor-pointer"
                      >
                        <TableCell className="w-8 p-0 align-middle">
                          <button
                            type="button"
                            className="flex items-center justify-center w-8 h-8 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 rounded"
                            aria-label={isOpen ? "Collapse row" : "Expand row"}
                            data-state={isOpen ? "open" : "closed"}
                          >
                            <ChevronRight
                              className={`transition-transform ${isOpen ? "rotate-90" : ""}`}
                            />
                          </button>
                        </TableCell>
                        {row.getVisibleCells().map((cell) => (
                          <TableCell key={cell.id}>
                            {flexRender(
                              cell.column.columnDef.cell,
                              cell.getContext()
                            )}
                          </TableCell>
                        ))}
                      </TableRow>
                    </CollapsibleTrigger>
                  </Collapsible>,
                  isOpen && (
                    <TableRow
                      key={row.id + "-expanded"}
                      className="bg-muted/20"
                    >
                      <TableCell colSpan={columns.length + 1} className="py-0">
                        <DealExpandedRow row={row} />
                      </TableCell>
                    </TableRow>
                  ),
                ];
              })
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length + 1}
                  className="h-24 text-center"
                >
                  <div className="flex items-center justify-center flex-col gap-2 py-10">
                    <Info className="w-10 h-10" />
                    <div className="flex flex-col items-center gap-5">
                      No deals were found with your current data, flip settings
                      and table filters.
                      <div className="text-muted-foreground">
                        To get started, go to the{" "}
                        <Link
                          href="/authenticated/token"
                          className="underline "
                        >
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
            )}
          </TableBody>
        </Table>
      </div>
      <DataTablePagination table={table} counts={counts} />
    </div>
  );
}
