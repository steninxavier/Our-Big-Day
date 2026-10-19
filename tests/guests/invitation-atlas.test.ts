// Opt-in only: inserts disposable records with generated IDs and removes those exact IDs.
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { loadEnvConfig } from "@next/env";
import mongoose, { Types } from "mongoose";
import { connectToDatabase } from "@/server/db/mongoose";

vi.mock("@/modules/guests/rsvp-rate", () => ({ limitRsvp: vi.fn() }));
import { getInvitation, getOrCreateInvitationLink, submitRsvp } from "@/modules/guests/invitation.service";
import { patchGuest } from "@/modules/guests/guest.service";

describe.skipIf(process.env.RUN_GUEST_ATLAS_TEST !== "1")("guest invitation against Atlas", () => {
  const weddingId = new Types.ObjectId();
  const userId = new Types.ObjectId();
  const membershipId = new Types.ObjectId();
  const guestId = new Types.ObjectId();
  const eventId = new Types.ObjectId();
  const otherEventId = new Types.ObjectId();
  beforeAll(async () => {
    const originalNodeEnv = process.env.NODE_ENV;
    vi.stubEnv("NODE_ENV", "development");
    loadEnvConfig(process.cwd(), true);
    vi.stubEnv("NODE_ENV", originalNodeEnv);
    await connectToDatabase();
    const db = mongoose.connection.db!;
    await db.collection("weddings").insertOne({ _id: weddingId, brideName: "QA", groomName: "Fixture", weddingDate: "2030-01-01", timeZone: "UTC", deletedAt: null, website: { slug: `qa-${weddingId.toString()}`, theme: "MINIMAL_ELEGANT", isPublished: false } });
    await db.collection("wedding_memberships").insertOne({ _id: membershipId, userId, weddingId, role: "ADMIN" });
    await db.collection("events").insertMany([{ _id: eventId, weddingId, name: "QA invited event", startsAt: new Date("2030-01-01"), archivedAt: null }, { _id: otherEventId, weddingId, name: "QA uninvited event", startsAt: new Date("2030-01-01"), archivedAt: null }]);
    await db.collection("guests").insertOne({ _id: guestId, weddingId, name: "QA guest", email: "", phone: "", notes: "private", maxGuests: 3, invitedEventIds: [eventId], rsvpStatus: "PENDING", numberAttending: null, revision: 0 });
  }, 30000);
  afterAll(async () => {
    const db = mongoose.connection.db;
    if (db) {
      await db.collection("guests").deleteOne({ _id: guestId });
      await db.collection("events").deleteOne({ _id: eventId });
      await db.collection("events").deleteOne({ _id: otherEventId });
      await db.collection("wedding_memberships").deleteOne({ _id: membershipId });
      await db.collection("weddings").deleteOne({ _id: weddingId });
      const remaining = await Promise.all([
        db.collection("guests").countDocuments({ _id: guestId }),
        db.collection("events").countDocuments({ _id: { $in: [eventId, otherEventId] } }),
        db.collection("wedding_memberships").countDocuments({ _id: membershipId }),
        db.collection("weddings").countDocuments({ _id: weddingId }),
      ]);
      expect(remaining).toEqual([0, 0, 0, 0]);
    }
    await mongoose.disconnect();
  }, 30000);
  it("creates a stable link, scopes event details, saves RSVP, and rejects stale edits", async () => {
    const link = await getOrCreateInvitationLink(userId.toString(), guestId.toString());
    expect((await getOrCreateInvitationLink(userId.toString(), guestId.toString())).url).toBe(link.url);
    const token = new URL(link.url).pathname.split("/").pop()!;
    const invitation = await getInvitation(token);
    expect(invitation.events.map((event) => event.name)).toEqual(["QA invited event"]);
    expect(JSON.stringify(invitation)).not.toContain("private");
    await expect(submitRsvp(token, { status: "ATTENDING", attendingCount: 4 })).rejects.toMatchObject({ code: "PARTY_SIZE_CHANGED" });
    expect(await submitRsvp(token, { status: "ATTENDING", attendingCount: 2 })).toMatchObject({ status: "ATTENDING", attendingCount: 2 });
    expect((await getInvitation(token)).guest).toMatchObject({ status: "ATTENDING", attendingCount: 2 });
    await expect(patchGuest(userId.toString(), guestId.toString(), { name: "Stale" }, 0)).rejects.toMatchObject({ code: "CONFLICT" });
  }, 30000);
});
