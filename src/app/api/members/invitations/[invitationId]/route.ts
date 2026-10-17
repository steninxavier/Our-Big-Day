import { getCurrentUser } from "@/modules/auth/auth.service";
import { revokeMemberInvitation } from "@/modules/members/member-management.service";
import { membershipResourceIdSchema } from "@/modules/members/schemas";
import { getSessionTokenFromCookie } from "@/server/auth/session-cookie";
import { handleRoute, successResponse } from "@/shared/http/response";
import { requireSameOrigin } from "@/shared/http/same-origin";

export async function DELETE(request: Request, { params }: { params: Promise<{ invitationId: string }> }) {
  return handleRoute(async () => {
    requireSameOrigin(request);
    const currentUser = await getCurrentUser(await getSessionTokenFromCookie());
    const invitationId = membershipResourceIdSchema.parse((await params).invitationId);
    await revokeMemberInvitation(currentUser.user.id, invitationId);
    return successResponse({ headers: { "Cache-Control": "no-store" } });
  });
}
