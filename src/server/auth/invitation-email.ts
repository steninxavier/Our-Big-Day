import { getMemberInvitation } from "@/modules/members/invitation.service";
import { invitationReturnPath } from "@/shared/auth/invitation-return";
import { AppError } from "@/shared/errors/app-error";

/** Resolve an address only from a valid, pending bearer invitation, never from a query parameter. */
export async function getInvitationEmailForReturn(value: unknown): Promise<string | undefined> {
  const path = invitationReturnPath(value);
  if (!path) return undefined;

  try {
    const invitation = await getMemberInvitation(path.slice("/member-invitations/".length));
    return invitation.email;
  } catch (error) {
    if (error instanceof AppError && error.code === "NOT_FOUND") return undefined;
    throw error;
  }
}
