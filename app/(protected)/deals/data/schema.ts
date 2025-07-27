import { z } from "zod";

const orderSchema = z.object({
  enchantmentLevel: z.string(),
  qualityLevel: z.string(),
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
