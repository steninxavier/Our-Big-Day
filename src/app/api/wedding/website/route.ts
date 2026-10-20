import { getCurrentUser } from "@/modules/auth/auth.service";
import { getWebsiteSettings, updateWebsiteSettings } from "@/modules/weddings/website.service";
import { websiteSettingsPatchSchema } from "@/modules/weddings/website.schemas";
import { getSessionTokenFromCookie } from "@/server/auth/session-cookie";
import { parseJson } from "@/shared/http/request";
import { dataResponse, handleRoute } from "@/shared/http/response";
import { requireSameOrigin } from "@/shared/http/same-origin";

export async function GET() { return handleRoute(async () => { const current = await getCurrentUser(await getSessionTokenFromCookie()); return dataResponse(await getWebsiteSettings(current.user.id), { headers: { "Cache-Control": "no-store" } }); }); }
export async function PATCH(request: Request) { return handleRoute(async () => { requireSameOrigin(request); const current = await getCurrentUser(await getSessionTokenFromCookie()); return dataResponse(await updateWebsiteSettings(current.user.id, await parseJson(request, websiteSettingsPatchSchema)), { headers: { "Cache-Control": "no-store" } }); }); }
