import { useSearchParams } from "next/navigation";
import { Deal } from "../data/schema";

interface DealCostBreakdownProps {
  deal: Deal;
}

export const DealCostBreakdown = ({ deal }: DealCostBreakdownProps) => {
  const params = useSearchParams();
  const premium = params.get("premium") === "true";
  function formatNumber(x: number) {
    return x.toLocaleString(undefined, {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    });
  }

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
    <div
      className="p-4 min-w-[280px] flex flex-col gap-1 text-sm"
      style={{ fontFamily: "Inter, sans-serif" }}
    >
      <div className="font-semibold text-base mb-1">Cost Breakdown</div>
      {rows.map((row) => (
        <div key={row.label} className="flex justify-between">
          <span className="text-xs text-muted-foreground">{row.label}</span>
          <span className="font-mono">{formatNumber(row.value)}</span>
        </div>
      ))}
      <div className="border-t my-1" />
      <div className="flex justify-between font-semibold">
        <span></span>
        <span className="font-mono">{formatNumber(deal.profit)}</span>
      </div>
    </div>
  );
};
