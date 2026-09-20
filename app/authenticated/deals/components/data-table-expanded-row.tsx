import { dealSchema } from "../data/schema";
import { DealCostBreakdown } from "./order-details-cost-breakdown";
import { OrderDetailsEnchantmentChecklist } from "./order-details-enchantment-checklist";
import { DealOrderTable } from "./order-details-table";
import type { DealRow } from "./data-table-config";
import type { RowData } from "@tanstack/react-table";

interface DealExpandedRowProps<TData extends RowData> {
  row: DealRow<TData>;
}

export function DealExpandedRow<TData extends RowData>({
  row,
}: DealExpandedRowProps<TData>) {
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
