"use client";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { parseDealSearchParams } from "@/utils/utils";
import { Settings } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useState } from "react";
import { updateDealSearchParams } from "./data-table-query";

function DealOptionCheckbox({
  id,
  checked,
  label,
  onCheckedChange,
}: {
  id: string;
  checked: boolean;
  label: string;
  onCheckedChange: (checked: boolean) => void;
}) {
  return (
    <label
      htmlFor={id}
      className="relative flex cursor-pointer select-none items-center gap-2 rounded-sm px-2 py-2 text-sm outline-none transition-colors hover:bg-accent focus-within:bg-accent focus-within:text-accent-foreground"
    >
      <Checkbox id={id} checked={checked} onCheckedChange={onCheckedChange} />
      <span className="w-full cursor-pointer">{label}</span>
    </label>
  );
}

export function DataTableDealOptions() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Get a new searchParams string by merging the current
  // searchParams with provided key/value pairs
  const createQueryString = useCallback(
    (updates: Record<string, string | null>) => {
      return updateDealSearchParams(searchParams.toString(), updates);
    },
    [searchParams],
  );

  // Local state for popover form
  const [open, setOpen] = useState(false);
  const parsedParameters = parseDealSearchParams(
    Object.fromEntries(searchParams.entries()),
  );
  const [localState, setLocalState] = useState(parsedParameters);

  // When popover opens, sync local state
  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen);
    if (nextOpen) {
      setLocalState(parsedParameters);
    }
  };

  // Check if local state differs from current search params (for Save button)
  const isChanged = (() => {
    return (
      localState.enchantmentUpgrade !== parsedParameters.enchantmentUpgrade ||
      localState.qualityUpgrade !== parsedParameters.qualityUpgrade ||
      localState.premium !== parsedParameters.premium ||
      localState.minProfit !== parsedParameters.minProfit ||
      localState.minPercentualProfit !== parsedParameters.minPercentualProfit ||
      localState.profitGate !== parsedParameters.profitGate
    );
  })();

  // Save handler: update search params from local state
  const handleSave = () => {
    const query = createQueryString({
      enchantmentUpgrade: localState.enchantmentUpgrade ? "1" : null,
      qualityUpgrade: localState.qualityUpgrade ? "1" : null,
      premium: localState.premium ? "1" : null,
      minProfit: localState.minProfit > 0 ? String(localState.minProfit) : null,
      minPercentualProfit:
        localState.minPercentualProfit > 0
          ? String(localState.minPercentualProfit)
          : null,
      profitGate:
        localState.profitGate !== "and" ? localState.profitGate : null,
    });
    router.push(query ? `${pathname}?${query}` : pathname);
    setOpen(false);
  };

  // Reset handler: set all to default
  const handleReset = () => {
    // Remove all filters from search params
    router.push(pathname);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger
        render={
          <Button
            variant="outline"
            size="sm"
            className="ml-auto hidden h-8 lg:flex"
          >
            <Settings />
            Options
          </Button>
        }
      />
      <PopoverContent className="w-[250px] p-1 bg-popover text-popover-foreground border shadow-md rounded-md">
        <div className="text-sm font-semibold px-2 py-1.5">Flip parameters</div>
        <div className="h-px bg-muted my-1 -mx-1" />
        <DealOptionCheckbox
          id="enchantmentUpgrade"
          checked={localState.enchantmentUpgrade}
          onCheckedChange={(checked) =>
            setLocalState((s) => ({ ...s, enchantmentUpgrade: checked }))
          }
          label="Enchantment Upgrades"
        />
        <DealOptionCheckbox
          id="qualityUpgrade"
          checked={localState.qualityUpgrade}
          onCheckedChange={(checked) =>
            setLocalState((s) => ({ ...s, qualityUpgrade: checked }))
          }
          label="Quality Upgrades"
        />
        <DealOptionCheckbox
          id="premium"
          checked={localState.premium}
          onCheckedChange={(checked) =>
            setLocalState((s) => ({ ...s, premium: checked }))
          }
          label="Premium"
        />
        <div className="h-px bg-muted my-1 -mx-1" />
        <div className="flex flex-col gap-2 rounded-sm px-2 py-1.5 text-sm outline-none">
          <div className="flex justify-between items-center">
            <Label htmlFor="minimumProfit">Minimum profit</Label>
            <Tabs
              value={localState.profitGate}
              onValueChange={(value) =>
                (value === "and" || value === "or") &&
                setLocalState((s) => ({ ...s, profitGate: value }))
              }
            >
              <TabsList size="xs">
                <TabsTrigger size="xs" value="and">
                  AND
                </TabsTrigger>
                <TabsTrigger size="xs" value="or">
                  OR
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
          <div className="flex items-center gap-2">
            <Input
              id="minimumProfit"
              type="number"
              placeholder="Minimum profit"
              className="h-8"
              value={localState.minProfit}
              onChange={(e) =>
                setLocalState((s) => ({
                  ...s,
                  minProfit: e.target.valueAsNumber || 0,
                }))
              }
              min={0}
            />
            silver
          </div>
          <div className="flex items-center gap-2">
            <Input
              id="minimumPercentualProfit"
              type="number"
              placeholder="Minimum percentual profit"
              className="h-8"
              value={localState.minPercentualProfit}
              onChange={(e) =>
                setLocalState((s) => ({
                  ...s,
                  minPercentualProfit: e.target.valueAsNumber || 0,
                }))
              }
              min={0}
            />
            %
          </div>
        </div>
        <div className="flex justify-between items-center p-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleReset}
            type="button"
            disabled={searchParams.size === 0}
          >
            Reset
          </Button>
          <Button
            variant="default"
            size="sm"
            onClick={handleSave}
            type="button"
            disabled={!isChanged}
          >
            Save
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
