"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverCheckboxItem,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Settings } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useState } from "react";

export function DataTableDealOptions() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Get a new searchParams string by merging the current
  // searchParams with provided key/value pairs
  const createQueryString = useCallback(
    (updates: Record<string, string>) => {
      const params = new URLSearchParams();
      Object.entries(updates).forEach(([name, value]) => {
        params.set(name, value);
      });
      return params.toString();
    },
    [searchParams]
  );

  // Local state for popover form
  const [open, setOpen] = useState(false);
  const parsedParameters = {
    enchantmentUpgrade: searchParams.get("enchantmentUpgrade") === "1",
    qualityUpgrade: searchParams.get("qualityUpgrade") === "1",
    premium: searchParams.get("premium") === "1",
    minProfit: Number(searchParams.get("minProfit")) || 0,
  };
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
      localState.minProfit !== parsedParameters.minProfit
    );
  })();

  // Save handler: update search params from local state
  const handleSave = () => {
    const params: Record<string, string> = {};
    if (localState.enchantmentUpgrade) params.enchantmentUpgrade = "1";
    if (localState.qualityUpgrade) params.qualityUpgrade = "1";
    if (localState.premium) params.premium = "1";
    if (localState.minProfit > 0)
      params.minProfit = String(localState.minProfit);
    const query =
      Object.keys(params).length > 0 ? "?" + createQueryString(params) : "";
    router.push(pathname + query);
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
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="ml-auto hidden h-8 lg:flex"
        >
          <Settings />
          Settings
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[250px] p-1 bg-popover text-popover-foreground border shadow-md rounded-md">
        <div className="text-sm font-semibold px-2 py-1.5">Flip parameters</div>
        <div className="h-px bg-muted my-1 -mx-1" />
        <PopoverCheckboxItem
          id="enchantmentUpgrade"
          checked={localState.enchantmentUpgrade}
          onCheckedChange={(checked) =>
            setLocalState((s) => ({ ...s, enchantmentUpgrade: !!checked }))
          }
          label="Enchantment Upgrades"
        />
        <PopoverCheckboxItem
          id="qualityUpgrade"
          checked={localState.qualityUpgrade}
          onCheckedChange={(checked) =>
            setLocalState((s) => ({ ...s, qualityUpgrade: !!checked }))
          }
          label="Quality Upgrades"
        />
        <PopoverCheckboxItem
          id="premium"
          checked={localState.premium}
          onCheckedChange={(checked) =>
            setLocalState((s) => ({ ...s, premium: !!checked }))
          }
          label="Premium"
        />
        <div className="h-px bg-muted my-1 -mx-1" />
        <div className="flex flex-col gap-2 rounded-sm px-2 py-1.5 text-sm outline-none">
          <Label htmlFor="minimumProfit">Minimum profit</Label>
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
