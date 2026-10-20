import { z } from "zod";

export const expenseCategories = ["VENUE", "CATERING", "PHOTOGRAPHY", "VIDEOGRAPHY", "DECORATION", "CLOTHING", "JEWELLERY", "ENTERTAINMENT", "INVITATIONS", "GIFTS", "TRAVEL", "MAKEUP", "MISCELLANEOUS"] as const;
const id = z.string().regex(/^[a-f\d]{24}$/i, "Invalid event.");
const date = z.iso.date("Enter a valid date.");
const fields = z.object({
  title: z.string().trim().min(1, "Enter an expense name.").max(120),
  amountPaise: z.number().int().min(1, "Enter an amount greater than zero.").max(100000000000),
  currency: z.literal("INR"), expenseDate: date, category: z.enum(expenseCategories),
  eventId: id.nullable(), vendorId: id.nullable(), notes: z.string().trim().max(2000),
}).strict();
export const expenseSchema = fields.extend({ currency: fields.shape.currency.default("INR"), eventId: fields.shape.eventId.default(null), vendorId: fields.shape.vendorId.default(null), notes: fields.shape.notes.default("") });
export const expensePatchSchema = fields.partial().extend({ expectedRevision: z.number().int().min(0).max(Number.MAX_SAFE_INTEGER) }).refine((value) => Object.keys(value).some((key) => key !== "expectedRevision"), "Provide a change.");
export const expenseQuerySchema = z.object({ page: z.coerce.number().int().min(1).max(100000).default(1), limit: z.coerce.number().int().min(1).max(100).default(20), search: z.string().trim().max(120).optional(), category: z.enum(expenseCategories).optional(), eventId: id.optional(), vendorId: id.optional(), from: date.optional(), to: date.optional() }).strict().refine((q) => !q.from || !q.to || q.from <= q.to, "The start date must be before the end date.");
export type ExpenseInput = z.output<typeof expenseSchema>;
export type ExpenseQuery = z.output<typeof expenseQuerySchema>;
