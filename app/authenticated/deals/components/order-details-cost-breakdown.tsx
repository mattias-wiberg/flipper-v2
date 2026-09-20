import { Separator } from "@/components/ui/separator";
import { formatNumber } from "@/lib/locale";
import { useSearchParams } from "next/navigation";
import { Deal } from "../data/schema";

interface DealCostBreakdownProps {
  deal: Deal;
}

export const DealCostBreakdown = ({ deal }: DealCostBreakdownProps) => {
  const params = useSearchParams();
  const premium = params.get("premium") === "1";

  const rows: { label: string; value: number }[] = [
    {
      label: "Buy order",
      value: deal.buyOrder.price,
    },
    {
      label: "Sell order",
      value: -deal.sellOrder.price,
    },
    {
      label: `Sales tax (${premium ? "4%" : "8%"})`,
      value: -deal.buyOrder.price * (premium ? 0.04 : 0.08),
    },
  ];
  if (deal.qualityUpgradeRequired && deal.qualityUpgradeCost) {
    rows.push({
      label: "Quality upgrade",
      value: -deal.qualityUpgradeCost,
    });
  }
  if (deal.enchantmentUpgradeRequired && deal.enchantmentUpgradeCost) {
    rows.push({
      label: "Enchantment upgrade",
      value: -deal.enchantmentUpgradeCost,
    });
  }

  return (
    <section
      className="flex flex-col gap-1 text-sm"
      style={{ fontFamily: "Inter, sans-serif" }}
      aria-label="Profit breakdown"
    >
      <h3 className="mb-1 text-base font-semibold whitespace-nowrap">
        Profit Breakdown
      </h3>
      {rows.map((row) => (
        <div key={row.label} className="flex justify-between gap-6">
          <span className="text-xs text-muted-foreground whitespace-nowrap">
            {row.label}
          </span>
          <span className="font-mono whitespace-nowrap">
            {formatNumber(row.value)}
          </span>
        </div>
      ))}
      <Separator className="my-1" />
      <div className="flex justify-end font-semibold">
        <span className="font-mono whitespace-nowrap">
          {formatNumber(deal.profit)}
        </span>
      </div>
    </section>
  );
};
