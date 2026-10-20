import { getPublicWeddingWebsite } from "@/modules/weddings/website.service";
import { dataResponse, handleRoute } from "@/shared/http/response";

type Context = { params: Promise<{ slug: string }> };

export async function GET(_request: Request, context: Context) {
  return handleRoute(async () => dataResponse(await getPublicWeddingWebsite((await context.params).slug), { headers: { "Cache-Control": "no-store" } }));
}
