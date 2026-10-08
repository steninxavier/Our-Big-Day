import { logout } from "@/modules/auth/auth.service";
import { clearSessionCookie, getSessionTokenFromCookie } from "@/server/auth/session-cookie";
import { handleRoute, successResponse } from "@/shared/http/response";

export async function POST() {
  return handleRoute(async () => {
    await logout(await getSessionTokenFromCookie());
    await clearSessionCookie();
    return successResponse();
  });
}
