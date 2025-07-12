import { z } from "zod";

export const orderSchema = z.object({
  Id: z.number(),
  ItemTypeId: z.string(),
  ItemGroupTypeId: z.string(),
  LocationId: z.number(),
  QualityLevel: z.number(),
  EnchantmentLevel: z.number(),
  UnitPriceSilver: z.number(),
  Amount: z.number(),
  AuctionType: z.string(),
  Expires: z.string(),
});

export const bodySchema = z.object({
  Orders: z.array(orderSchema),
});
