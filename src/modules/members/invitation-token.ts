import { createHmac } from "node:crypto";
import { AppError } from "@/shared/errors/app-error";

export function hashMemberInvitationToken(token: string) {
  const secret = process.env.MEMBER_INVITATION_SECRET;
  if (!secret || Buffer.byteLength(secret, "utf8") < 32) {
    throw new AppError("CONFIGURATION_ERROR", "Member invitations are not configured. Please contact the administrator.", 503);
  }
  return createHmac("sha256", secret).update(token).digest("hex");
}
