import { constructTable, tableFeatures } from "@tanstack/react-table";
import { storeReactivityBindings } from "@tanstack/table-core/store-reactivity-bindings";
import { columns } from "./columns";
import type { Deal } from "../data/schema";
import { dealTableFeatures, type DealTableFeatures } from "./data-table-config";

const testFeatures: DealTableFeatures = tableFeatures({
  ...dealTableFeatures,
  coreReactivityFeature: storeReactivityBindings(),
});

function makeDeal(
  id: number,
  location: string,
  name = "Master's Broadsword",
): Deal {
  const order = {
    id,
    itemTypeId: "T6_MAIN_SWORD",
    enchantmentLevel: 0,
    qualityLevel: 1,
    price: 100,
    location,
    createdAt: new Date("2026-01-01"),
  };

  return {
    name,
    tier: "6",
    buyOrder: order,
    sellOrder: { ...order, id: id + 100 },
    profit: 100,
    percentualProfit: 10,
    qualityUpgradeRequired: false,
    enchantmentUpgradeRequired: false,
    amount: 1,
  };
}

describe("deals table columns", () => {
  it("sorts deals by the displayed location", () => {
    const table = constructTable({
      features: testFeatures,
      data: [makeDeal(1, "Lymhurst Market"), makeDeal(2, "Caerleon Market")],
      columns,
      initialState: { sorting: [{ id: "location", desc: false }] },
    });

    expect(
      table.getRowModel().rows.map((row) => row.original.sellOrder.location),
    ).toEqual(["Caerleon Market", "Lymhurst Market"]);
  });

  it("applies filtering, pagination, and column visibility state", () => {
    const table = constructTable({
      features: testFeatures,
      data: [
        makeDeal(1, "Lymhurst Market", "Master's Broadsword"),
        makeDeal(2, "Caerleon Market", "Adept's Bow"),
        makeDeal(3, "Bridgewatch Market", "Journeyman's Broadsword"),
      ],
      columns,
      initialState: {
        columnFilters: [{ id: "name", value: "broadsword" }],
        columnVisibility: { location: false },
        pagination: { pageIndex: 1, pageSize: 1 },
      },
    });

    expect(table.getPageCount()).toBe(2);
    expect(table.getRowModel().rows).toHaveLength(1);
    expect(table.getColumn("location")?.getIsVisible()).toBe(false);

    expect(table.getRowModel().rows[0]?.original.name).toBe(
      "Journeyman's Broadsword",
    );
  });
});
