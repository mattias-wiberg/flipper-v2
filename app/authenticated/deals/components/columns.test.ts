import {
  createTable,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
} from "@tanstack/react-table";
import { columns } from "./columns";
import type { Deal } from "../data/schema";

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
    const table = createTable<Deal>({
      data: [makeDeal(1, "Lymhurst Market"), makeDeal(2, "Caerleon Market")],
      columns,
      state: { sorting: [{ id: "location", desc: false }] },
      onStateChange: () => {},
      getCoreRowModel: getCoreRowModel(),
      getSortedRowModel: getSortedRowModel(),
      renderFallbackValue: null,
    });

    expect(
      table.getRowModel().rows.map((row) => row.original.sellOrder.location),
    ).toEqual(["Caerleon Market", "Lymhurst Market"]);
  });

  it("applies filtering, pagination, and column visibility state", () => {
    const table = createTable<Deal>({
      data: [
        makeDeal(1, "Lymhurst Market", "Master's Broadsword"),
        makeDeal(2, "Caerleon Market", "Adept's Bow"),
        makeDeal(3, "Bridgewatch Market", "Journeyman's Broadsword"),
      ],
      columns,
      state: {
        columnFilters: [{ id: "name", value: "broadsword" }],
        columnVisibility: { location: false },
        pagination: { pageIndex: 1, pageSize: 1 },
      },
      onStateChange: () => {},
      getCoreRowModel: getCoreRowModel(),
      getFilteredRowModel: getFilteredRowModel(),
      getPaginationRowModel: getPaginationRowModel(),
      renderFallbackValue: null,
    });

    expect(table.getPageCount()).toBe(2);
    expect(table.getRowModel().rows).toHaveLength(1);
    expect(table.getColumn("location")?.getIsVisible()).toBe(false);

    expect(table.getRowModel().rows[0]?.original.name).toBe(
      "Journeyman's Broadsword",
    );
  });
});
