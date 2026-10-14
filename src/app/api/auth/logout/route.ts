import { logout } from "@/modules/auth/auth.service";
import { clearSessionCookie, getSessionTokenFromCookie } from "@/server/auth/session-cookie";
import { handleRoute, successResponse } from "@/shared/http/response";

export async function POST() {
  return handleRoute(async () => {
    try {
      await logout(await getSessionTokenFromCookie());
    } finally {
      // Also discard a stale/invalid browser cookie so the next request begins
      // in a clean signed-out state.
      await clearSessionCookie();
    }

    return successResponse();
  });
}
