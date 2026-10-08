import { dataResponse } from "@/shared/http/response";

export async function GET() {
  return dataResponse({ status: "ok" });
}
