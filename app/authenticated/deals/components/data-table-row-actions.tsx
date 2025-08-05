"use client";

import { deleteSpecificOrderAction } from "@/app/actions";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Row } from "@tanstack/react-table";
import { MoreHorizontal } from "lucide-react";
import { toast } from "sonner";
import { dealSchema } from "../data/schema";

interface DataTableRowActionsProps<TData> {
  row: Row<TData>;
}

export function DataTableRowActions<TData>({
  row,
}: DataTableRowActionsProps<TData>) {
  const { data: deal } = dealSchema.safeParse(row.original);

  if (!deal) {
    return "?";
  }

  const deleteSpecificOrder = async (id: number) => {
    const error = await deleteSpecificOrderAction(id);
    if (error) {
      toast.error("Failed to clear item order", {
        description: "There was an error deleting the item order.",
        position: "top-center",
      });
    } else {
      toast.success("Item order cleared successfully", {
        description: "The item order has been deleted.",
        position: "top-center",
      });
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="data-[state=open]:bg-muted size-8"
        >
          <MoreHorizontal />
          <span className="sr-only">Open menu</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[160px]">
        {/* <DropdownMenuItem>Mark as flipped</DropdownMenuItem> */}
        {/* <DropdownMenuSeparator /> */}
        <DropdownMenuSub>
          <DropdownMenuSubTrigger>Delete</DropdownMenuSubTrigger>
          <DropdownMenuSubContent>
            <DropdownMenuItem
              onClick={() => deleteSpecificOrder(deal.sellOrder.id)}
            >
              Sell order
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => deleteSpecificOrder(deal.buyOrder.id)}
            >
              Buy order
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => {
                deleteSpecificOrder(deal.sellOrder.id);
                deleteSpecificOrder(deal.buyOrder.id);
              }}
            >
              Both
            </DropdownMenuItem>
          </DropdownMenuSubContent>
        </DropdownMenuSub>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
