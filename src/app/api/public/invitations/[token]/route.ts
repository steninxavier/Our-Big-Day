import { getInvitation } from "@/modules/guests/invitation.service";
import { dataResponse } from "@/shared/http/response";
import { handleSensitiveRoute } from "@/server/http/sensitive-route";

export async function GET(_request: Request, context: { params: Promise<{ token: string }> }) {
  return handleSensitiveRoute(async () => dataResponse(await getInvitation((await context.params).token), { headers: { "Cache-Control": "no-store", "Referrer-Policy": "no-referrer", "X-Robots-Tag": "noindex, nofollow" } }));
}
