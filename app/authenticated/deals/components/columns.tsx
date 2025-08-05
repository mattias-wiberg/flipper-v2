"use client";

import { ColumnDef } from "@tanstack/react-table";

import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ArrowUp10, ArrowUpZA } from "lucide-react";
import { Deal } from "../data/schema";
import { DataTableColumnHeader } from "./data-table-column-header";
import { DataTableRowActions } from "./data-table-row-actions";

export const columns: ColumnDef<Deal>[] = [
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
    cell: ({ row }) => <div>{row.getValue("name")}</div>,
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
    accessorKey: "amount",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Amount" />
    ),
    cell: ({ row }) => <div className="w-[80px]">{row.getValue("amount")}</div>,
  },
  {
    accessorKey: "location",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Location" />
    ),
    cell: ({ row }) => {
      const location =
        row.original.sellOrder.location || row.original.buyOrder.location;
      return <div className="w-[80px]">{location}</div>;
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
              <TooltipTrigger asChild>
                <ArrowUp10 className="text-sm text-muted-foreground cursor-help" />
              </TooltipTrigger>
              <TooltipContent>
                <p>Enchantment upgrade required</p>
              </TooltipContent>
            </Tooltip>
          )}
          {qualityUpgradeRequired && (
            <Tooltip>
              <TooltipTrigger asChild>
                <ArrowUpZA className="text-sm text-muted-foreground cursor-help" />
              </TooltipTrigger>
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
