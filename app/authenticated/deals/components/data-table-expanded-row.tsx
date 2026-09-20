import { Row } from "@tanstack/react-table";

import { dealSchema } from "../data/schema";
import { DealCostBreakdown } from "./order-details-cost-breakdown";
import { OrderDetailsEnchantmentChecklist } from "./order-details-enchantment-checklist";
import { DealOrderTable } from "./order-details-table";

interface DealExpandedRowProps<TData> {
  row: Row<TData>;
}

export function DealExpandedRow<TData>({ row }: DealExpandedRowProps<TData>) {
  const { data: deal } = dealSchema.safeParse(row.original);

  return (
    <>
      {deal ? (
        <div className="flex min-w-0 flex-col gap-6 p-4 xl:flex-row">
          <DealOrderTable deal={deal} />
          {deal.enchantmentUpgradeRequired &&
            deal.enchantmentUpgradeShoppingList?.some(
              (section) => section.length > 0,
            ) && <OrderDetailsEnchantmentChecklist deal={deal} />}
          <DealCostBreakdown deal={deal} />
        </div>
      ) : (
        <div role="alert">
          Error loading deal details please provide this information to the
          developers: <code>{JSON.stringify(row.original)}</code>
        </div>
      )}
    </>
  );
}
