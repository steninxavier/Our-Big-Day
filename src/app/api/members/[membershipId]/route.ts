import { getCurrentUser } from "@/modules/auth/auth.service";
import { removeWeddingMember } from "@/modules/members/member-management.service";
import { membershipResourceIdSchema } from "@/modules/members/schemas";
import { getSessionTokenFromCookie } from "@/server/auth/session-cookie";
import { handleRoute, successResponse } from "@/shared/http/response";
import { requireSameOrigin } from "@/shared/http/same-origin";

export async function DELETE(request: Request, { params }: { params: Promise<{ membershipId: string }> }) {
  return handleRoute(async () => {
    requireSameOrigin(request);
    const currentUser = await getCurrentUser(await getSessionTokenFromCookie());
    const membershipId = membershipResourceIdSchema.parse((await params).membershipId);
    await removeWeddingMember(currentUser.user.id, membershipId);
    return successResponse({ headers: { "Cache-Control": "no-store" } });
  });
}
