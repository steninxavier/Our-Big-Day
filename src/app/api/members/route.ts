import { getCurrentUser } from "@/modules/auth/auth.service";
import { listWeddingMembers } from "@/modules/members/member-directory.service";
import { getSessionTokenFromCookie } from "@/server/auth/session-cookie";
import { dataResponse, handleRoute } from "@/shared/http/response";

export async function GET() {
  return handleRoute(async () => {
    const currentUser = await getCurrentUser(await getSessionTokenFromCookie());
    return dataResponse(await listWeddingMembers(currentUser.user.id), { headers: { "Cache-Control": "no-store" } });
  });
}
