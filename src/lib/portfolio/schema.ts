// src/lib/portfolio/schema.ts
import { z } from "zod";

export const REGION_VALUES = ["KR", "US", "GLOBAL"] as const;
export type Region = (typeof REGION_VALUES)[number];

export const HoldingItemSchema = z.object({
  ticker: z.string().min(1).max(20).nullable(),
  name: z.string().min(1).max(50),
  quantity: z.number().nonnegative().finite(),
  value_krw: z.number().nonnegative().finite(),
  region: z.enum(REGION_VALUES),
});
export type HoldingItem = z.infer<typeof HoldingItemSchema>;

export const HoldingsArraySchema = z.array(HoldingItemSchema).max(100);

export const HoldingsResponseSchema = z.object({
  items: HoldingsArraySchema,
});
export type HoldingsResponse = z.infer<typeof HoldingsResponseSchema>;
