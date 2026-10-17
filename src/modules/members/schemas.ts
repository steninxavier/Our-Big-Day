import { z } from "zod";
import { MEMBER_ROLES } from "@/shared/auth/member-roles";

export const inviteMemberSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(254),
  role: z.enum(MEMBER_ROLES),
}).strict();

export const invitationTokenSchema = z.string().regex(/^[A-Za-z0-9_-]{43}$/);
export const membershipResourceIdSchema = z.string().regex(/^[a-fA-F0-9]{24}$/);
