import { submitRsvp } from "@/modules/guests/invitation.service";
import { rsvpSchema } from "@/modules/guests/rsvp.schemas";
import { parseSmallJson } from "@/shared/http/request";
import { dataResponse } from "@/shared/http/response";
import { handleSensitiveRoute } from "@/server/http/sensitive-route";
import { requireSameOrigin } from "@/shared/http/same-origin";

export async function POST(request: Request, context: { params: Promise<{ token: string }> }) {
  return handleSensitiveRoute(async () => { requireSameOrigin(request); const input = await parseSmallJson(request, rsvpSchema); return dataResponse(await submitRsvp((await context.params).token, input), { headers: { "Cache-Control": "no-store", "Referrer-Policy": "no-referrer", "X-Robots-Tag": "noindex, nofollow" } }); });
}
