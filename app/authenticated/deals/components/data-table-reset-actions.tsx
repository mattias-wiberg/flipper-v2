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

import { ResetDialog } from "@/components/reset-dialog";
import * as React from "react";

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
  const [openItemDialog, setOpenItemDialog] = React.useState(false);
  const [openCraftingDialog, setOpenCraftingDialog] = React.useState(false);

  // Check localStorage for do-not-show-again flags
  const shouldSkipItemDialog =
    typeof window !== "undefined" &&
    localStorage.getItem("skipItemOrdersResetDialog") === "true";
  const shouldSkipCraftingDialog =
    typeof window !== "undefined" &&
    localStorage.getItem("skipCraftingMaterialOrdersResetDialog") === "true";

  const handleItemReset = () => {
    if (shouldSkipItemDialog) {
      deleteItemOrders();
    } else {
      setOpenItemDialog(true);
    }
  };

  const handleCraftingReset = () => {
    if (shouldSkipCraftingDialog) {
      deleteCraftingMaterialOrders();
    } else {
      setOpenCraftingDialog(true);
    }
  };

  const handleItemDialogConfirm = (doNotShowAgain: boolean) => {
    if (doNotShowAgain && typeof window !== "undefined") {
      localStorage.setItem("skipItemOrdersResetDialog", "true");
    }
    deleteItemOrders();
  };

  const handleCraftingDialogConfirm = (doNotShowAgain: boolean) => {
    if (doNotShowAgain && typeof window !== "undefined") {
      localStorage.setItem("skipCraftingMaterialOrdersResetDialog", "true");
    }
    deleteCraftingMaterialOrders();
  };

  return (
    <>
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
          <DropdownMenuItem onClick={handleItemReset}>
            Item orders
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleCraftingReset}>
            Crafting material orders
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <ResetDialog
        open={openItemDialog}
        onOpenChange={setOpenItemDialog}
        title="Reset Item Orders"
        description="This will permanently delete all buy and sell orders for all items such as weapons, armor, etc. This action cannot be undone. Are you sure you want to proceed?"
        confirmLabel="Reset orders"
        cancelLabel="Cancel"
        onConfirm={handleItemDialogConfirm}
      />
      <ResetDialog
        open={openCraftingDialog}
        onOpenChange={setOpenCraftingDialog}
        title="Reset Crafting Material Orders"
        description="This will permanently delete all runes, souls and relics. This action cannot be undone. Are you sure you want to proceed?"
        confirmLabel="Reset orders"
        cancelLabel="Cancel"
        onConfirm={handleCraftingDialogConfirm}
      />
    </>
  );
}
