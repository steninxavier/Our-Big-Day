import { getCurrentUser } from "@/modules/auth/auth.service";
import { inviteMember } from "@/modules/members/invitation.service";
import { listPendingMemberInvitations } from "@/modules/members/member-directory.service";
import { inviteMemberSchema } from "@/modules/members/schemas";
import { getSessionTokenFromCookie } from "@/server/auth/session-cookie";
import { parseJson } from "@/shared/http/request";
import { dataResponse, handleRoute } from "@/shared/http/response";
import { requireSameOrigin } from "@/shared/http/same-origin";

export async function GET() {
  return handleRoute(async () => {
    const currentUser = await getCurrentUser(await getSessionTokenFromCookie());
    return dataResponse(await listPendingMemberInvitations(currentUser.user.id), { headers: { "Cache-Control": "no-store" } });
  });
}

export async function POST(request: Request) {
  return handleRoute(async () => {
    requireSameOrigin(request);
    const currentUser = await getCurrentUser(await getSessionTokenFromCookie());
    const input = await parseJson(request, inviteMemberSchema);
    return dataResponse(await inviteMember(currentUser.user.id, input.email, input.role), { status: 201 });
  });
}
