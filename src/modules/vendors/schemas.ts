import { z } from "zod";

export const vendorCategories = ["PHOTOGRAPHER", "VIDEOGRAPHER", "VENUE", "CATERER", "DECORATOR", "DJ", "MAKEUP_ARTIST", "MEHENDI_ARTIST", "PANDIT", "CHOREOGRAPHER", "FLORIST", "WEDDING_PLANNER", "TRANSPORT", "OTHER"] as const;

const id = z.string().regex(/^[a-f\d]{24}$/i, "Invalid reference.");
const optionalText = (max: number) => z.string().trim().max(max);
const eventIds = z.array(id).max(25, "Choose up to 25 events.").refine((ids) => new Set(ids).size === ids.length, "Choose each event only once.");
const fields = z.object({
  name: z.string().trim().min(1, "Enter a vendor name.").max(160),
  category: z.enum(vendorCategories),
  contactPerson: optionalText(120),
  phone: optionalText(40),
  email: z.string().trim().max(254).refine((value) => !value || z.email().safeParse(value).success, "Enter a valid email address."),
  address: optionalText(500),
  website: z.string().trim().max(2048).refine((value) => !value || z.url().safeParse(value).success, "Enter a valid website URL."),
  totalAgreedCostPaise: z.number().int().min(0).max(100000000000).nullable(),
  eventIds,
  notes: optionalText(2000),
}).strict();

export const vendorSchema = fields.extend({ contactPerson: fields.shape.contactPerson.default(""), phone: fields.shape.phone.default(""), email: fields.shape.email.default(""), address: fields.shape.address.default(""), website: fields.shape.website.default(""), totalAgreedCostPaise: fields.shape.totalAgreedCostPaise.default(null), eventIds: fields.shape.eventIds.default([]), notes: fields.shape.notes.default("") });
export const vendorPatchSchema = fields.partial().extend({ expectedRevision: z.number().int().min(0).max(Number.MAX_SAFE_INTEGER) }).refine((value) => Object.keys(value).some((key) => key !== "expectedRevision"), "Provide a change.");
export const vendorQuerySchema = z.object({
  page: z.coerce.number().int().min(1).max(100000).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  category: z.enum(vendorCategories).optional(),
  search: z.string().trim().max(160).optional(),
  includeArchived: z.literal("true").optional().transform(Boolean),
}).strict();

export type VendorInput = z.output<typeof vendorSchema>;
export type VendorQuery = z.output<typeof vendorQuerySchema>;
