import { getMemberInvitation } from "@/modules/members/invitation.service";
import { dataResponse, handleRoute } from "@/shared/http/response";

export async function GET(_request: Request, { params }: { params: Promise<{ token: string }> }) {
  return handleRoute(async () => dataResponse(await getMemberInvitation((await params).token), { headers: { "Cache-Control": "no-store", "Referrer-Policy": "no-referrer", "X-Robots-Tag": "noindex, nofollow" } }));
}
