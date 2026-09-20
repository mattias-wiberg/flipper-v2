"use client";

import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ArrowUp10, ArrowUpZA } from "lucide-react";
import { Deal } from "../data/schema";
import { DataTableColumnHeader } from "./data-table-column-header";
import { DataTableRowActions } from "./data-table-row-actions";
import type { DealColumnDef } from "./data-table-config";

export const columns: DealColumnDef<Deal>[] = [
  // TODO: add selection actions
  // {
  //   id: "select",
  //   header: ({ table }) => (
  //     <Checkbox
  //       checked={
  //         table.getIsAllPageRowsSelected() ||
  //         (table.getIsSomePageRowsSelected() && "indeterminate")
  //       }
  //       onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
  //       aria-label="Select all"
  //       className="translate-y-[2px]"
  //     />
  //   ),
  //   cell: ({ row }) => (
  //     <Checkbox
  //       checked={row.getIsSelected()}
  //       onCheckedChange={(value) => row.toggleSelected(!!value)}
  //       aria-label="Select row"
  //       className="translate-y-[2px]"
  //     />
  //   ),
  //   enableSorting: false,
  //   enableHiding: false,
  // },
  {
    accessorKey: "name",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Name" />
    ),
    cell: ({ row }) => {
      const name = row.getValue("name");
      return (
        <Tooltip>
          <TooltipTrigger
            render={
              <Button
                variant="link"
                onClick={(event) => {
                  if (typeof name === "string") {
                    navigator.clipboard.writeText(name);
                    event.preventDefault();
                  }
                }}
                className="pl-0"
                aria-label="Copy name to clipboard"
              >
                {typeof name === "string" ? name : String(name)}
              </Button>
            }
          />
          <TooltipContent>Click to copy name</TooltipContent>
        </Tooltip>
      );
    },
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: "tier",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Tier" />
    ),
    cell: ({ row }) => <div className="w-[80px]">{row.getValue("tier")}</div>,
  },
  {
    accessorKey: "profit",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Profit" />
    ),
    cell: ({ row }) => (
      <div className="w-[80px]">
        {row.original.profit.toLocaleString(undefined, {
          minimumFractionDigits: 0,
          maximumFractionDigits: 0,
        })}
      </div>
    ),
  },
  {
    accessorKey: "percentualProfit",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Margin (%)" />
    ),
    cell: ({ row }) => (
      <div className="w-[80px]">
        {row.original.percentualProfit.toLocaleString(undefined, {
          minimumFractionDigits: 0,
          maximumFractionDigits: 0,
        })}
      </div>
    ),
  },
  {
    accessorKey: "amount",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Amount" />
    ),
    cell: ({ row }) => <div className="w-[80px]">{row.getValue("amount")}</div>,
  },
  {
    id: "location",
    accessorFn: (row) => row.sellOrder.location || row.buyOrder.location,
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Location" />
    ),
    cell: ({ row }) => {
      const location =
        row.original.sellOrder.location || row.original.buyOrder.location;
      return <div className="w-[80px] whitespace-nowrap">{location}</div>;
    },
  },
  {
    id: "actions",
    cell: ({ row }) => {
      const { enchantmentUpgradeRequired, qualityUpgradeRequired } =
        row.original;
      return (
        <div className="flex items-center justify-end gap-1">
          {enchantmentUpgradeRequired && (
            <Tooltip>
              <TooltipTrigger
                render={
                  <span
                    role="img"
                    tabIndex={0}
                    aria-label="Enchantment upgrade required"
                    className="cursor-help text-sm text-muted-foreground"
                  >
                    <ArrowUp10 aria-hidden="true" />
                  </span>
                }
              />
              <TooltipContent>
                <p>Enchantment upgrade required</p>
              </TooltipContent>
            </Tooltip>
          )}
          {qualityUpgradeRequired && (
            <Tooltip>
              <TooltipTrigger
                render={
                  <span
                    role="img"
                    tabIndex={0}
                    aria-label="Quality upgrade required"
                    className="cursor-help text-sm text-muted-foreground"
                  >
                    <ArrowUpZA aria-hidden="true" />
                  </span>
                }
              />
              <TooltipContent>
                <p>Quality upgrade required</p>
              </TooltipContent>
            </Tooltip>
          )}
          <DataTableRowActions row={row} />
        </div>
      );
    },
  },
];
