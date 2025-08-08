"use client";

import { Table } from "@tanstack/react-table";
import { RefreshCcw, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

import { useRouter } from "next/navigation";
import { tiers } from "../data/data";
import { DataTableDealOptions } from "./data-table-deal-options";
import { DataTableFacetedFilter } from "./data-table-faceted-filter";
import { DataTableResetActions } from "./data-table-reset-actions";
import { DataTableViewOptions } from "./data-table-view-options";

interface DataTableToolbarProps<TData> {
  table: Table<TData>;
}

export function DataTableToolbar<TData>({
  table,
}: DataTableToolbarProps<TData>) {
  const router = useRouter();
  const isFiltered = table.getState().columnFilters.length > 0;

  return (
    <div className="flex items-center justify-between">
      <div className="flex flex-1 items-center gap-2">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="icon"
                className="size-8"
                onClick={() => router.refresh()}
              >
                <RefreshCcw />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">Refresh flips</TooltipContent>
          </Tooltip>
        </TooltipProvider>
        <Input
          placeholder="Filter found flips..."
          value={(table.getColumn("name")?.getFilterValue() as string) ?? ""}
          onChange={(event) =>
            table.getColumn("name")?.setFilterValue(event.target.value)
          }
          className="h-8 w-[150px] lg:w-[250px]"
        />
        <DataTableFacetedFilter
          column={table.getColumn("tier")}
          title="Tier"
          options={tiers}
        />
        {isFiltered && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => table.resetColumnFilters()}
          >
            Reset
            <X />
          </Button>
        )}
      </div>
      <div className="flex items-center gap-2">
        <DataTableResetActions />
        <DataTableDealOptions />
        <DataTableViewOptions table={table} />
      </div>
    </div>
  );
}
