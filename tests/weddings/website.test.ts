import { beforeEach, describe, expect, it, vi } from "vitest";
import { Types } from "mongoose";

import { websiteSettingsPatchSchema, websiteSettingsSchema } from "@/modules/weddings/website.schemas";

const mocks = vi.hoisted(() => ({ memberFind: vi.fn(), weddingExists: vi.fn(), weddingFind: vi.fn(), eventFind: vi.fn() }));
vi.mock("@/server/db/mongoose", () => ({ connectToDatabase: vi.fn() }));
vi.mock("@/modules/members/models/wedding-membership.model", () => ({ WeddingMembershipModel: { findOne: mocks.memberFind } }));
vi.mock("@/modules/weddings/models/wedding.model", () => ({ WeddingModel: { exists: mocks.weddingExists, findOne: mocks.weddingFind } }));
vi.mock("@/modules/events/models/event.model", () => ({ EventModel: { find: mocks.eventFind } }));

import { getPublicWeddingWebsite, getWebsiteSettings } from "@/modules/weddings/website.service";

const weddingId = new Types.ObjectId();
const websiteWedding = {
  _id: weddingId,
  brideName: "Liya",
  groomName: "John",
  title: "Liya & John",
  description: "Celebrate with us.",
  weddingDate: "2027-02-14",
  timeZone: "Asia/Kolkata",
  website: { slug: "liya-john-14022027", theme: "MINIMAL_ELEGANT" as const, isPublished: true, welcomeMessage: "We cannot wait to see you." },
  gallery: { isEnabled: true },
  livestream: { isEnabled: true, youtubeUrl: "https://www.youtube.com/watch?v=abcdefghijk" },
};

function lean(value: unknown) { return { lean: () => ({ exec: async () => value }) }; }

describe("wedding website validation", () => {
  it("accepts the configured fields and rejects empty or tenant-controlled updates", () => {
    expect(websiteSettingsSchema.parse({ theme: "MINIMAL_ELEGANT", isPublished: true, welcomeMessage: " Welcome " })).toEqual({ theme: "MINIMAL_ELEGANT", isPublished: true, welcomeMessage: "Welcome" });
    expect(websiteSettingsPatchSchema.safeParse({}).success).toBe(false);
    expect(websiteSettingsPatchSchema.safeParse({ weddingId: weddingId.toString() }).success).toBe(false);
  });
});

describe("public wedding website", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.memberFind.mockReturnValue(lean({ weddingId, role: "ADMIN" }));
    mocks.weddingExists.mockResolvedValue(true);
    mocks.weddingFind.mockReturnValue(lean(websiteWedding));
    mocks.eventFind.mockReturnValue({ sort: () => ({ lean: () => ({ exec: async () => [{ _id: new Types.ObjectId(), name: "Wedding ceremony", startsAt: new Date("2027-02-14T05:00:00.000Z"), venueName: "St. Mary's Hall", address: "Kochi", dressCode: "Traditional" }] }) }) });
  });

  it("keeps coordinators out of private website settings", async () => {
    mocks.memberFind.mockReturnValue(lean({ weddingId, role: "EVENT_COORDINATOR" }));
    await expect(getWebsiteSettings("coordinator-1")).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(mocks.weddingFind).not.toHaveBeenCalled();
  });

  it("serves only a published wedding and active event data", async () => {
    const result = await getPublicWeddingWebsite("liya-john-14022027");
    expect(mocks.weddingFind).toHaveBeenCalledWith({ "website.slug": "liya-john-14022027", "website.isPublished": true, deletedAt: null });
    expect(mocks.eventFind).toHaveBeenCalledWith({ weddingId, archivedAt: null });
    expect(result).toMatchObject({ title: "Liya & John", gallery: { enabled: true }, livestream: { enabled: true, youtubeUrl: "https://www.youtube.com/watch?v=abcdefghijk" }, events: [{ name: "Wedding ceremony", venueName: "St. Mary's Hall" }] });
  });

  it("does not disclose unpublished or unknown slugs", async () => {
    mocks.weddingFind.mockReturnValue(lean(null));
    await expect(getPublicWeddingWebsite("private-wedding")).rejects.toMatchObject({ code: "NOT_FOUND", status: 404 });
    expect(mocks.eventFind).not.toHaveBeenCalled();
  });
});
