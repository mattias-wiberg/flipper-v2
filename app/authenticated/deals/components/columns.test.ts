import {
  createTable,
  getCoreRowModel,
  getSortedRowModel,
} from "@tanstack/react-table";
import { columns } from "./columns";
import type { Deal } from "../data/schema";

function makeDeal(id: number, location: string): Deal {
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
    name: "Master's Broadsword",
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
      data: [
        makeDeal(1, "Lymhurst Market"),
        makeDeal(2, "Caerleon Market"),
      ],
      columns,
      state: { sorting: [{ id: "location", desc: false }] },
      onStateChange: () => {},
      getCoreRowModel: getCoreRowModel(),
      getSortedRowModel: getSortedRowModel(),
      renderFallbackValue: null,
    });

    expect(
      table
        .getRowModel()
        .rows.map((row) => row.original.sellOrder.location)
    ).toEqual(["Caerleon Market", "Lymhurst Market"]);
  });
});
