"use client";

import { getDeals } from "@/lib/deals";
import { getItemName } from "@/utils/items";
import { getWorldName } from "@/utils/worlds";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Deal } from "../data/schema";
import { columns } from "./columns";
import { DataTable } from "./data-table";

export function RealtimeDeals({
    initialData,
    searchParams,
}: {
    initialData: {
        deals: Deal[];
        counts: {
            sellOrders: number;
            buyOrders: number;
            potentialDeals: number;
        };
    };
    searchParams: any;
}) {
    const [deals, setDeals] = useState<Deal[]>(initialData.deals);
    const [counts, setCounts] = useState(initialData.counts);
    const supabase = useMemo(() => createClientComponentClient(), []);
    const mountedRef = useRef(true);

    const fetchAndUpdateDeals = useCallback(async () => {
        try {
        const {
            tier,
            minProfit,
            qualityUpgrade,
            enchantmentUpgrade,
            premium,
            minPercentualProfit,
            profitGate,
        } = searchParams;

        let buyOrderQuery = supabase
            .from("orders")
            .select(
                "id, item_type_id, location_id, item_group_type_id, enchantment_level, quality_level, unit_price_silver, amount, created_at"
            )
            .eq("action_type", "request");
        if (tier) {
            buyOrderQuery = buyOrderQuery.eq("tier", tier);
        }
        const buyOrders = await buyOrderQuery;
        if (buyOrders.error) {
            console.error("Error fetching buy orders:", buyOrders.error);
            return;
        }

        let sellOrderQuery = supabase
            .from("orders")
            .select(
                "id, item_type_id, location_id, item_group_type_id, tier, enchantment_level, quality_level, unit_price_silver, amount, created_at"
            )
            .eq("action_type", "offer");
        if (tier) {
            sellOrderQuery = sellOrderQuery.eq("tier", tier);
        }
        const sellOrders = await sellOrderQuery;
        if (sellOrders.error) {
            console.error("Error fetching sell orders:", sellOrders.error);
            return;
        }

        const { deals: newDeals, potentialDealsCount } = getDeals({
            sellOrders: sellOrders.data.map((order: any) => ({
                ...order,
                created_at: new Date(order.created_at),
            })),
            buyOrders: buyOrders.data.map((order: any) => ({
                ...order,
                created_at: new Date(order.created_at),
            })),
            premium,
            minProfit,
            minPercentualProfit,
            profitGate,
            qualityUpgrade,
            enchantmentUpgrade,
        });

        const tableData: Deal[] = newDeals.map((deal) => ({
            amount: deal.amount,
            name: getItemName(deal.orders.buyOrder.item_group_type_id),
            tier: deal.orders.sellOrder.tier?.toString() ?? "",
            profit: deal.orders.profit,
            percentualProfit: deal.orders.percentualProfit,
            qualityUpgradeRequired: deal.orders.qualityUpgrade,
            qualityUpgradeCost: deal.orders.qualityUpgradeCost,
            enchantmentUpgradeRequired: deal.orders.enchantmentUpgrade,
            enchantmentUpgradeCost: deal.orders.enchantmentUpgradeCost,
            enchantmentUpgradeShoppingList: deal.orders.enchantmentUpgradeShoppingList,
            buyOrder: {
                id: deal.orders.buyOrder.id,
                location: getWorldName(deal.orders.buyOrder.location_id),
                itemTypeId: deal.orders.buyOrder.item_type_id,
                enchantmentLevel: deal.orders.buyOrder.enchantment_level,
                qualityLevel: deal.orders.buyOrder.quality_level,
                price: deal.orders.buyOrder.unit_price_silver,
                createdAt: deal.orders.buyOrder.created_at,
            },
            sellOrder: {
                id: deal.orders.sellOrder.id,
                location: getWorldName(deal.orders.sellOrder.location_id),
                itemTypeId: deal.orders.sellOrder.item_type_id,
                enchantmentLevel: deal.orders.sellOrder.enchantment_level,
                qualityLevel: deal.orders.sellOrder.quality_level,
                price: deal.orders.sellOrder.unit_price_silver,
                createdAt: deal.orders.sellOrder.created_at,
            },
            }));

            setDeals(tableData);
            setCounts({
                sellOrders: sellOrders.data.length,
                buyOrders: buyOrders.data.length,
                potentialDeals: potentialDealsCount,
            });
        } catch (error) {
            console.error("Error updating deals:", error);
            // Optionally set error state here for UI feedback
        }
    }, [searchParams, supabase, mountedRef]);

    useEffect(() => {
        mountedRef.current = true;

        // Fetch initial data on mount to ensure fresh client snapshot
        fetchAndUpdateDeals();

        // Set up real-time listeners for both buy and sell orders
        const channel = supabase
            .channel("orders-channel")
            .on(
                "postgres_changes",
                {
                    event: "*", // Listen for all events (INSERT, UPDATE, DELETE)
                    schema: "public",
                    table: "orders",
                },
                () => {
                    // Refresh data when any change occurs
                    if (mountedRef.current) {
                        fetchAndUpdateDeals();
                    }
                }
            )
            .subscribe();

        // Clean up subscription
        return () => {
            mountedRef.current = false;
            channel.unsubscribe();
        };
    }, [supabase, fetchAndUpdateDeals]); // Re-subscribe when dependencies change

    return (
        <div className="flex-1 w-full max-w-6xl flex flex-col mx-auto py-8">
            <DataTable data={deals} columns={columns} counts={counts} />
        </div>
    );
}