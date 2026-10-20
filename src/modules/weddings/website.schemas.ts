import { z } from "zod";

export const websiteThemes = ["CLASSIC_INDIAN", "MINIMAL_ELEGANT", "MODERN_CELEBRATION"] as const;

const settingsFields = z.object({
  theme: z.enum(websiteThemes),
  isPublished: z.boolean(),
  welcomeMessage: z.string().trim().max(2000, "Keep the welcome message under 2,000 characters."),
}).strict();

export const websiteSettingsSchema = settingsFields;
export const websiteSettingsPatchSchema = settingsFields.partial().refine((value) => Object.keys(value).length > 0, "Provide a website setting to update.");

export type WebsiteSettingsInput = z.output<typeof websiteSettingsSchema>;
export type WebsiteSettingsPatch = z.output<typeof websiteSettingsPatchSchema>;
