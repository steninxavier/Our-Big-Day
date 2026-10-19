import { describe, expect, it } from "vitest";
import { rsvpSchema } from "@/modules/guests/rsvp.schemas";
import { parseSmallJson } from "@/shared/http/request";

describe("public RSVP request limits", () => {
  it("accepts a small valid JSON response", async () => {
    const request = new Request("http://localhost/", { method: "POST", body: JSON.stringify({ status: "ATTENDING", attendingCount: 2 }) });
    expect(await parseSmallJson(request, rsvpSchema)).toEqual({ status: "ATTENDING", attendingCount: 2 });
  });
  it("rejects a body over the byte limit even without a content-length header", async () => {
    const request = new Request("http://localhost/", { method: "POST", body: "x".repeat(8193) });
    await expect(parseSmallJson(request, rsvpSchema)).rejects.toMatchObject({ status: 413 });
  });
});
