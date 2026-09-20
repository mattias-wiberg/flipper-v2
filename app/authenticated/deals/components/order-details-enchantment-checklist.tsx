"use client";

import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";
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
    Array(flatList.length).fill(false),
  );
  const checklistKey = flatList
    .map((entry) => `${entry.amount}:${entry.price}`)
    .join("|");

  useEffect(() => {
    setChecked(Array(flatList.length).fill(false));
  }, [checklistKey, flatList.length]);

  // Map from section/row to flat index
  const getFlatIndex = (sectionIdx: number, rowIdx: number) => {
    let idx = 0;
    for (let i = 0; i < sectionIdx; i++) {
      idx += shoppingList[i]?.length || 0;
    }
    return idx + rowIdx;
  };

  const handleCheck = (flatIdx: number, nextValue: boolean) => {
    setChecked((prev) => {
      const updated = [...prev];
      updated[flatIdx] = nextValue;
      return updated;
    });
  };

  // Calculate total amount and total cost
  const allEntries = shoppingList.flat();
  const totalAmount = allEntries.reduce(
    (sum, entry) => sum + (entry?.amount || 0),
    0,
  );
  const totalCost = allEntries.reduce(
    (sum, entry) => sum + (entry?.amount || 0) * (entry?.price || 0),
    0,
  );

  return (
    <section
      className="flex flex-col gap-1 text-sm"
      style={{ fontFamily: "Inter, sans-serif" }}
      aria-label="Enchantment materials"
    >
      <h3 className="mb-1 text-base font-semibold whitespace-nowrap">
        Enchantment materials
      </h3>
      <div className="flex flex-col gap-3">
        {shoppingList.map((section, sectionIdx) =>
          section && section.length > 0 ? (
            <div key={SECTION_LABELS[sectionIdx] || sectionIdx}>
              <div className="mb-1 flex items-center">
                <span className="text-xs text-muted-foreground font-medium whitespace-nowrap">
                  {SECTION_LABELS[sectionIdx] || `Type ${sectionIdx + 1}`}
                </span>
                <Separator className="ml-2 flex-1" />
              </div>
              <div className="flex flex-col gap-1">
                {section.map((entry, rowIdx) => {
                  const flatIdx = getFlatIndex(sectionIdx, rowIdx);
                  return (
                    <div
                      key={`${sectionIdx}-${rowIdx}`}
                      className="flex items-center justify-between gap-2"
                    >
                      <label
                        htmlFor={`enchant-${sectionIdx}-${rowIdx}`}
                        className="flex min-w-0 flex-1 cursor-pointer items-center gap-2"
                      >
                        <Checkbox
                          checked={checked[flatIdx]}
                          onCheckedChange={(value) =>
                            handleCheck(flatIdx, value)
                          }
                          id={`enchant-${sectionIdx}-${rowIdx}`}
                          aria-label={`Mark ${entry.amount} materials at ${entry.price.toLocaleString()} silver as collected`}
                        />
                        <span
                          className={cn(
                            "text-muted-foreground truncate text-xs",
                            checked[flatIdx] && "line-through",
                          )}
                        >
                          {entry.amount}x
                        </span>
                      </label>
                      <span
                        className={cn(
                          "text-right font-mono text-xs",
                          checked[flatIdx] && "line-through",
                        )}
                        style={{ minWidth: 60 }}
                      >
                        {entry.price.toLocaleString()}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : null,
        )}
        {allEntries.length > 0 && (
          <>
            <Separator className="my-1" />
            <div className="flex items-center justify-between gap-2">
              <span className="text-muted-foreground text-xs font-semibold">
                {totalAmount}x
              </span>
              <span
                className="text-right font-mono text-xs font-semibold"
                style={{ minWidth: 60 }}
              >
                {totalCost.toLocaleString(undefined, {
                  maximumFractionDigits: 0,
                })}
              </span>
            </div>
          </>
        )}
      </div>
    </section>
  );
};
