import { z } from "zod";

const orderSchema = z.object({
  itemTypeId: z.string(),
  enchantmentLevel: z.number().min(0).max(4),
  qualityLevel: z.number().min(0).max(4),
  price: z.number(),
});
export const dealSchema = z.object({
  name: z.string(),
  tier: z.number(),
  buyOrder: orderSchema,
  sellOrder: orderSchema,
  profit: z.number(),
  // profitPercentage: z.number(),
  // qualityUpgradeCost: z.number().nullable(),
  // enchantmentUpgradeCost: z.number().nullable(),
  qualityUpgradeRequired: z.boolean(),
  enchantmentUpgradeRequired: z.boolean(),
  amount: z.number(),
});

export type Deal = z.infer<typeof dealSchema>;
