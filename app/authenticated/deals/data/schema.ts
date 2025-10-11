import { z } from "zod";

const orderSchema = z.object({
  id: z.number(),
  itemTypeId: z.string(),
  enchantmentLevel: z.number().min(0).max(4),
  qualityLevel: z.number().min(1).max(5),
  price: z.number(),
  location: z.string(),
  createdAt: z.date(),
});
export const dealSchema = z.object({
  name: z.string(),
  tier: z.string(),
  buyOrder: orderSchema,
  sellOrder: orderSchema,
  profit: z.number(),
  percentualProfit: z.number(),
  qualityUpgradeRequired: z.boolean(),
  qualityUpgradeCost: z.number().optional(),
  enchantmentUpgradeRequired: z.boolean(),
  enchantmentUpgradeCost: z.number().optional(),
  enchantmentUpgradeShoppingList: z
    .array(
      z.array(
        z.object({
          amount: z.number(),
          price: z.number(),
        })
      )
    )
    .optional(),
  amount: z.number(),
});

export type Deal = z.infer<typeof dealSchema>;
