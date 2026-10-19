import { z } from "zod";

export const guestStatuses = ["PENDING", "ATTENDING", "NOT_ATTENDING"] as const;
const id = z.string().regex(/^[a-f\d]{24}$/i, "Invalid event.");
const fields = z.object({
  name: z.string().trim().min(1, "Enter a guest name.").max(120),
  email: z.union([z.literal(""), z.email("Enter a valid email address.").max(254)]).transform((v) => v.toLowerCase()),
  phone: z.string().trim().max(40).regex(/^[\d\s+().-]*$/, "Enter a valid phone number."),
  maxGuests: z.number().int().min(1, "Allow at least one attendee.").max(10000),
  invitedEventIds: z.array(id).max(100).refine((ids) => new Set(ids.map((v) => v.toLowerCase())).size === ids.length, "Select each event once."),
  notes: z.string().trim().max(2000),
}).strict();
export const guestSchema = fields.extend({ email: fields.shape.email.default(""), phone: fields.shape.phone.default(""), maxGuests: fields.shape.maxGuests.default(1), invitedEventIds: fields.shape.invitedEventIds.default([]), notes: fields.shape.notes.default("") });
export const guestPatchSchema = fields.partial().extend({ expectedRevision: z.number().int().min(0).max(Number.MAX_SAFE_INTEGER) }).refine((v) => Object.keys(v).some((k) => k !== "expectedRevision"), "Provide a change.");
export const guestQuerySchema = z.object({
  page: z.coerce.number().int().min(1).max(100000).default(1), limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().trim().max(120).optional(), rsvpStatus: z.enum(guestStatuses).optional(), eventId: id.optional(),
  invitationSent: z.enum(["true", "false"]).optional(),
}).strict();
export type GuestInput = z.output<typeof guestSchema>;
export type GuestQuery = z.output<typeof guestQuerySchema>;
