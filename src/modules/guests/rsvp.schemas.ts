import { z } from "zod";

export const rsvpSchema = z.discriminatedUnion("status", [
  z.object({ status: z.literal("ATTENDING"), attendingCount: z.number().int().min(1).max(10000) }).strict(),
  z.object({ status: z.literal("NOT_ATTENDING"), attendingCount: z.literal(0) }).strict(),
]);
export type RsvpInput = z.infer<typeof rsvpSchema>;
