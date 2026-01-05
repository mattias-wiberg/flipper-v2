import { z } from "zod";

export const orderSchema = z.object({
  Id: z.number(),
  ItemTypeId: z.string(),
  ItemGroupTypeId: z.string(),
  LocationId: z.string(),
  QualityLevel: z.number(),
  EnchantmentLevel: z.number(),
  UnitPriceSilver: z.number(),
  Amount: z.number(),
  AuctionType: z.string(),
  Expires: z.preprocess((arg) => {
    if (typeof arg === "string") {
      return arg.trim().replaceAll(" ", "");
    }
    console.warn("Unexpected Expires field type:", arg);
    return arg;
  }, z.string()),
});

export const bodySchema = z.object({
  Orders: z.array(orderSchema),
});
