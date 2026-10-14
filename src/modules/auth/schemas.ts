import { z } from "zod";

const emailSchema = z.string().trim().toLowerCase().email().max(254);
export const MAX_PASSWORD_BYTES = 72;

const bcryptSafePasswordSchema = z
  .string()
  .max(MAX_PASSWORD_BYTES, `Use ${MAX_PASSWORD_BYTES} characters or fewer.`)
  .refine(
    (value) => new TextEncoder().encode(value).byteLength <= MAX_PASSWORD_BYTES,
    `Use ${MAX_PASSWORD_BYTES} UTF-8 bytes or fewer.`,
  );

const passwordSchema = bcryptSafePasswordSchema.min(8, "Use at least 8 characters.");
const loginPasswordSchema = bcryptSafePasswordSchema.min(1, "Enter your password.");

export const signUpSchema = z.object({
  name: z.string().trim().min(1).max(120),
  email: emailSchema,
  password: passwordSchema,
});

export const loginSchema = z.object({
  email: emailSchema,
  password: loginPasswordSchema,
});

export const forgotPasswordSchema = z.object({
  email: emailSchema,
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1).max(512),
  password: passwordSchema,
});

export type SignUpInput = z.output<typeof signUpSchema>;
export type LoginInput = z.output<typeof loginSchema>;
