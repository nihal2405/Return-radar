import { z } from "zod";

export const ExtractedPurchaseSchema = z.object({
  isReturnablePurchase: z.boolean().describe("True only if this is a genuine completed order confirmation or purchase receipt of physical/returnable merchandise. False for marketing, advertisements, news, newsletters, spam, and digital subscriptions."),
  productName: z.string().describe("The name of the main product purchased"),
  retailer: z.string().describe("The name of the store or website where the purchase was made"),
  purchaseDate: z.string().describe("The date the purchase was made in YYYY-MM-DD format"),
  deliveryDate: z.string().optional().describe("The date the item was delivered, if mentioned"),
  price: z.number().optional().describe("The total price paid"),
  returnWindowDays: z.number().optional().describe("The number of days allowed for a return, e.g., 30"),
  returnWindowStartsFrom: z.enum(["purchase_date", "delivery_date"]).optional().describe("Whether the return window begins on the purchase date or delivery date"),
  confidenceScore: z.number().min(0).max(100).describe("How confident you are in this extraction from 0 to 100"),
  missingInformation: z.string().optional().describe("If any crucial information like return window or dates is missing, explain what is missing here to ask the user.")
});

export type ExtractedPurchase = z.infer<typeof ExtractedPurchaseSchema>;
