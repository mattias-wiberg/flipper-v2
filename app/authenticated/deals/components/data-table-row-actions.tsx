"use client";

import { deleteSpecificOrderAction } from "@/app/actions";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
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

  const deleteSpecificOrder = async (orderIds: number | number[]) => {
    const multiple = Array.isArray(orderIds);
    const error = await deleteSpecificOrderAction(orderIds);
    if (error) {
      toast.error(`Failed to clear item order${multiple ? "s" : ""}`, {
        description: multiple
          ? "There was an error deleting the item orders."
          : "There was an error deleting the item order.",
        position: "top-center",
      });
    } else {
      toast.success(`Item order${multiple ? "s" : ""} cleared successfully`, {
        description: multiple
          ? "The item orders have been deleted."
          : "The item order has been deleted.",
        position: "top-center",
      });
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="ghost"
            size="icon"
            className="data-popup-open:bg-muted size-8"
          >
            <MoreHorizontal />
            <span className="sr-only">Open menu</span>
          </Button>
        }
      />
      <DropdownMenuContent align="end" className="w-[160px]">
        {/* <DropdownMenuItem>Mark as flipped</DropdownMenuItem> */}
        {/* <DropdownMenuSeparator /> */}
        <DropdownMenuGroup>
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>Delete</DropdownMenuSubTrigger>
            <DropdownMenuSubContent>
              <DropdownMenuGroup>
                <DropdownMenuItem
                  onClick={() => void deleteSpecificOrder(deal.sellOrder.id)}
                >
                  Sell order
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => void deleteSpecificOrder(deal.buyOrder.id)}
                >
                  Buy order
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() =>
                    void deleteSpecificOrder([
                      deal.sellOrder.id,
                      deal.buyOrder.id,
                    ])
                  }
                >
                  Both
                </DropdownMenuItem>
              </DropdownMenuGroup>
            </DropdownMenuSubContent>
          </DropdownMenuSub>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
