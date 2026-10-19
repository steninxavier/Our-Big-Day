import { describe, expect, it } from "vitest";
import { eventPatchSchema, eventSchema } from "@/modules/events/schemas";

describe("event validation", () => {
  const input = { name: "Mehendi", startsAt: "2027-02-12T10:30:00.000Z" };
  it("accepts an event and defaults coordinator assignments to empty", () => {
    expect(eventSchema.parse(input).coordinatorIds).toEqual([]);
  });
  it("rejects a client-supplied wedding and timestamps without offsets", () => {
    expect(eventSchema.safeParse({ ...input, weddingId: "other" }).success).toBe(false);
    expect(eventSchema.safeParse({ ...input, startsAt: "2027-02-12T10:30" }).success).toBe(false);
  });
  it("rejects an end before the start and invalid coordinator identifiers", () => {
    expect(eventSchema.safeParse({ ...input, endsAt: "2027-02-12T10:00:00Z" }).success).toBe(false);
    expect(eventSchema.safeParse({ ...input, coordinatorIds: ["not-an-id"] }).success).toBe(false);
  });
  it("does not erase assignments in a partial update", () => {
    expect(eventPatchSchema.parse({ name: "Reception" })).toEqual({ name: "Reception" });
  });
});
