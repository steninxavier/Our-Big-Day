import { getCurrentUser } from "@/modules/auth/auth.service";
import { getOrCreateInvitationLink } from "@/modules/guests/invitation.service";
import { getSessionTokenFromCookie } from "@/server/auth/session-cookie";
import { dataResponse } from "@/shared/http/response";
import { handleSensitiveRoute } from "@/server/http/sensitive-route";
import { requireSameOrigin } from "@/shared/http/same-origin";

export async function POST(request: Request, context: { params: Promise<{ guestId: string }> }) {
  return handleSensitiveRoute(async () => { requireSameOrigin(request); const current = await getCurrentUser(await getSessionTokenFromCookie()); return dataResponse(await getOrCreateInvitationLink(current.user.id, (await context.params).guestId), { headers: { "Cache-Control": "no-store", "Referrer-Policy": "no-referrer" } }); });
}
