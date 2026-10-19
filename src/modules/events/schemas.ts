import { z } from "zod";

export const eventTypes = ["ROKA", "ENGAGEMENT", "MEHENDI", "HALDI", "SANGEET", "COCKTAIL", "WEDDING", "RECEPTION", "CUSTOM"] as const;
const timestamp = z.iso.datetime({ offset: true });
const objectId = z.string().regex(/^[a-f\d]{24}$/i, "Invalid coordinator.");

const eventFields = z.object({
  name: z.string().trim().min(1, "Enter an event name.").max(120),
  type: z.enum(eventTypes).optional(),
  startsAt: timestamp,
  endsAt: timestamp.nullable().optional(),
  venueName: z.string().trim().max(200).optional(),
  address: z.string().trim().max(500).optional(),
  description: z.string().trim().max(2000).optional(),
  dressCode: z.string().trim().max(200).optional(),
  coordinatorIds: z.array(objectId).max(100).default([]),
}).strict();
export const eventPatchSchema = eventFields.extend({ coordinatorIds: z.array(objectId).max(100).optional() }).partial();
export const eventSchema = eventFields.refine((value) => !value.endsAt || new Date(value.endsAt) > new Date(value.startsAt), {
  path: ["endsAt"], message: "End time must be after the start time.",
});

export type EventInput = z.output<typeof eventSchema>;
