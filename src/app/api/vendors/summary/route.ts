import { getCurrentUser } from "@/modules/auth/auth.service";
import { vendorSummary } from "@/modules/vendors/vendor.service";
import { getSessionTokenFromCookie } from "@/server/auth/session-cookie";
import { dataResponse, handleRoute } from "@/shared/http/response";

export async function GET() { return handleRoute(async () => { const current = await getCurrentUser(await getSessionTokenFromCookie()); return dataResponse(await vendorSummary(current.user.id), { headers: { "Cache-Control": "no-store" } }); }); }
