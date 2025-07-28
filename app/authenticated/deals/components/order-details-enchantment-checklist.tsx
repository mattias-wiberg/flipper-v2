import { Checkbox } from "@/components/ui/checkbox";
import { useState } from "react";
import { Deal } from "../data/schema";

interface OrderDetailsEnchantmentChecklistProps {
  deal: Deal;
}

export const OrderDetailsEnchantmentChecklist = ({
  deal,
}: OrderDetailsEnchantmentChecklistProps) => {
  // Section labels for the three types
  const SECTION_LABELS = ["Runes", "Souls", "Relics"];
  const shoppingList = deal.enchantmentUpgradeShoppingList || [];
  // Flatten for checked state: [ [a, b], [c] ] => [a, b, c]
  const flatList = shoppingList.flat();
  const [checked, setChecked] = useState<boolean[]>(
    Array(flatList.length).fill(false)
  );

  // Map from section/row to flat index
  const getFlatIndex = (sectionIdx: number, rowIdx: number) => {
    let idx = 0;
    for (let i = 0; i < sectionIdx; i++) {
      idx += shoppingList[i]?.length || 0;
    }
    return idx + rowIdx;
  };

  const handleCheck = (flatIdx: number) => {
    setChecked((prev) => {
      const updated = [...prev];
      updated[flatIdx] = !updated[flatIdx];
      return updated;
    });
  };

  // Calculate total amount and total cost
  const allEntries = shoppingList.flat();
  const totalAmount = allEntries.reduce(
    (sum, entry) => sum + (entry?.amount || 0),
    0
  );
  const totalCost = allEntries.reduce(
    (sum, entry) => sum + (entry?.amount || 0) * (entry?.price || 0),
    0
  );

  return (
    <div
      className="flex flex-col gap-1 text-sm"
      style={{ fontFamily: "Inter, sans-serif" }}
    >
      <div className="font-semibold text-base mb-1 whitespace-nowrap">
        Enchantment materials
      </div>
      <div className="space-y-3">
        {shoppingList.map((section, sectionIdx) =>
          section && section.length > 0 ? (
            <div key={SECTION_LABELS[sectionIdx] || sectionIdx}>
              <div className="flex items-center mb-1">
                <span className="text-xs text-muted-foreground font-medium whitespace-nowrap">
                  {SECTION_LABELS[sectionIdx] || `Type ${sectionIdx + 1}`}
                </span>
                <span className="flex-1 border-t border-gray-200 ml-2" />
              </div>
              <div className="flex flex-col gap-1">
                {section.map((entry, rowIdx) => {
                  const flatIdx = getFlatIndex(sectionIdx, rowIdx);
                  return (
                    <div
                      key={rowIdx}
                      className="flex items-center justify-between gap-2"
                    >
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <Checkbox
                          checked={checked[flatIdx]}
                          onCheckedChange={() => handleCheck(flatIdx)}
                          id={`enchant-${sectionIdx}-${rowIdx}`}
                        />
                        <span
                          className={
                            (checked[flatIdx] && "line-through") +
                            " text-muted-foreground text-xs truncate"
                          }
                        >
                          {entry.amount}x
                        </span>
                      </div>
                      <span
                        className={
                          (checked[flatIdx] && "line-through") +
                          " font-mono text-xs text-right"
                        }
                        style={{ minWidth: 60 }}
                      >
                        {entry.price.toLocaleString()}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : null
        )}
        {allEntries.length > 0 && (
          <div className="flex items-center justify-between gap-2 mt-2 pt-2 border-t border-gray-200">
            <span className="text-muted-foreground text-xs font-semibold">
              {totalAmount}x
            </span>
            <span
              className="font-mono text-xs text-right font-semibold"
              style={{ minWidth: 60 }}
            >
              {totalCost.toLocaleString(undefined, {
                maximumFractionDigits: 0,
              })}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};
