"use client";

import {
  deleteCraftingMaterialOrdersAction,
  deleteItemOrdersAction,
} from "@/app/actions";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Rewind } from "lucide-react";
import { toast } from "sonner";

const deleteItemOrders = async () => {
  const error = await deleteItemOrdersAction();
  if (error) {
    toast.error("Failed to clear item orders", {
      description: "There was an error deleting item orders.",
      position: "top-center",
    });
  } else {
    toast.success("Item orders cleared successfully", {
      description: "All item orders have been deleted.",
      position: "top-center",
    });
  }
};

const deleteCraftingMaterialOrders = async () => {
  const error = await deleteCraftingMaterialOrdersAction();
  if (error) {
    toast.error("Failed to clear crafting material orders", {
      description: "There was an error deleting crafting material orders.",
      position: "top-center",
    });
  } else {
    toast.success("Crafting material orders cleared successfully", {
      description: "All crafting material orders have been deleted.",
      position: "top-center",
    });
  }
};

export function DataTableResetActions() {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="ml-auto hidden h-8 lg:flex"
        >
          <Rewind />
          Reset
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        <DropdownMenuItem onClick={() => deleteItemOrders()}>
          Item orders
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => deleteCraftingMaterialOrders()}>
          Crafting material orders
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
