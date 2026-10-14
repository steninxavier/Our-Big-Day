import { z } from "zod";

const dateOnly = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD.");

const validDateOnly = dateOnly.refine(
  (value) => {
    const [year, month, day] = value.split("-").map(Number);
    const date = new Date(Date.UTC(year, month - 1, day));

    return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
  },
  "Use a valid calendar date.",
);

const timeZone = z.string().refine(
  (value) => {
    try {
      Intl.DateTimeFormat(undefined, { timeZone: value });
      return true;
    } catch {
      return false;
    }
  },
  "Use an IANA timezone, such as Asia/Kolkata.",
);

const locationSchema = z.object({
  formattedAddress: z.string().trim().max(500).optional(),
  city: z.string().trim().min(1).max(120),
  state: z.string().trim().max(120).optional(),
  country: z.string().trim().max(120).optional(),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  googlePlaceId: z.string().trim().max(255).optional(),
});

export const createWeddingSchema = z.object({
  brideName: z.string().trim().min(1).max(120),
  groomName: z.string().trim().min(1).max(120),
  title: z.string().trim().min(1).max(180).optional(),
  description: z.string().trim().max(2_000).optional(),
  weddingDate: validDateOnly,
  timeZone,
  location: locationSchema,
});

export type CreateWeddingInput = z.output<typeof createWeddingSchema>;
