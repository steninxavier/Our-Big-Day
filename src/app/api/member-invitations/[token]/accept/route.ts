import { getCurrentUser } from "@/modules/auth/auth.service";
import { acceptMemberInvitation } from "@/modules/members/invitation.service";
import { getSessionTokenFromCookie } from "@/server/auth/session-cookie";
import { dataResponse, handleRoute } from "@/shared/http/response";
import { requireSameOrigin } from "@/shared/http/same-origin";

export async function POST(request: Request, { params }: { params: Promise<{ token: string }> }) {
  return handleRoute(async () => {
    requireSameOrigin(request);
    const currentUser = await getCurrentUser(await getSessionTokenFromCookie());
    return dataResponse(await acceptMemberInvitation((await params).token, currentUser.user), { headers: { "Cache-Control": "no-store", "Referrer-Policy": "no-referrer" } });
  });
}
