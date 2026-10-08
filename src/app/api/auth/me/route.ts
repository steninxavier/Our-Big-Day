import { getCurrentUser } from "@/modules/auth/auth.service";
import { getSessionTokenFromCookie } from "@/server/auth/session-cookie";
import { dataResponse, handleRoute } from "@/shared/http/response";

export async function GET() {
  return handleRoute(async () => dataResponse(await getCurrentUser(await getSessionTokenFromCookie())));
}
