import { Row } from "@tanstack/react-table";

import { dealSchema } from "../data/schema";
import { DealCostBreakdown } from "./order-details-cost-breakdown";
import { OrderDetailsEnchantmentChecklist } from "./order-details-enchantment-checklist";
import { DealOrderTable } from "./order-details-table";

interface DealExpandedRowProps<TData> {
  row: Row<TData>;
}

export function DealExpandedRow<TData>({ row }: DealExpandedRowProps<TData>) {
  const deal = dealSchema.parse(row.original);
  console.log("Rendering expanded row for deal:", deal);

  return (
    <div className="flex flex-row gap-7 p-4">
      <DealOrderTable deal={deal} />
      {deal.enchantmentUpgradeRequired &&
        deal.enchantmentUpgradeShoppingList && (
          <OrderDetailsEnchantmentChecklist deal={deal} />
        )}
      <DealCostBreakdown deal={deal} />
    </div>
  );
}
