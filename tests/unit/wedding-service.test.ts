import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  connectToDatabase: vi.fn(),
  createOpaqueToken: vi.fn(),
  hashOpaqueToken: vi.fn((token: string) => `hash:${token}`),
  membershipExists: vi.fn(),
  membershipCreate: vi.fn(),
  weddingExists: vi.fn(),
  weddingCreate: vi.fn(),
}));

vi.mock("@/server/db/mongoose", () => ({ connectToDatabase: mocks.connectToDatabase }));
vi.mock("@/server/auth/tokens", () => ({ createOpaqueToken: mocks.createOpaqueToken, hashOpaqueToken: mocks.hashOpaqueToken }));
vi.mock("@/modules/members/models/wedding-membership.model", () => ({
  WeddingMembershipModel: {
    exists: mocks.membershipExists,
    create: mocks.membershipCreate,
  },
}));
vi.mock("@/modules/weddings/models/wedding.model", () => ({
  WeddingModel: {
    exists: mocks.weddingExists,
    create: mocks.weddingCreate,
  },
}));

import { createWedding } from "@/modules/weddings/wedding.service";

const input = {
  brideName: "Líya!",
  groomName: "John Doe",
  weddingDate: "2027-02-14",
  timeZone: "Asia/Kolkata",
  location: { city: "Kochi" },
};

function query(value: unknown) {
  return { session: vi.fn().mockReturnValue(Promise.resolve(value)) };
}

describe("wedding service", () => {
  const session = {
    withTransaction: vi.fn(async (callback: () => Promise<void>) => callback()),
    endSession: vi.fn(),
  };

  beforeEach(() => {
    for (const mock of Object.values(mocks)) mock.mockReset();
    session.withTransaction.mockReset().mockImplementation(async (callback: () => Promise<void>) => callback());
    session.endSession.mockReset();
    mocks.connectToDatabase.mockResolvedValue({ startSession: vi.fn().mockResolvedValue(session) });
    mocks.createOpaqueToken.mockReturnValue("gallery-token");
    mocks.hashOpaqueToken.mockImplementation((token: string) => `hash:${token}`);
    mocks.membershipExists.mockImplementation(() => query(null));
    mocks.weddingExists.mockImplementation(() => query(null));
    mocks.membershipCreate.mockResolvedValue([]);
    mocks.weddingCreate.mockResolvedValue([{
      _id: { toString: () => "wedding-1" },
      brideName: "Líya!",
      groomName: "John Doe",
      weddingDate: "2027-02-14",
      website: { slug: "liya-john-doe-20270214" },
    }]);
  });

  it("creates an ADMIN wedding in one transaction with an available normalized slug", async () => {
    await expect(createWedding("user-1", input)).resolves.toEqual({
      id: "wedding-1",
      brideName: "Líya!",
      groomName: "John Doe",
      weddingDate: "2027-02-14",
      website: { slug: "liya-john-doe-20270214" },
    });
    expect(mocks.weddingExists).toHaveBeenCalledWith({ "website.slug": "liya-john-doe-20270214" });
    expect(mocks.weddingCreate).toHaveBeenCalledWith([expect.objectContaining({
      createdByUserId: "user-1",
      website: { slug: "liya-john-doe-20270214", theme: "MINIMAL_ELEGANT", isPublished: false },
      gallery: { tokenHash: "hash:gallery-token", isEnabled: true, guestUploadsEnabled: true },
    })], { session });
    expect(mocks.membershipCreate).toHaveBeenCalledWith([expect.objectContaining({ userId: "user-1", weddingId: expect.anything(), role: "ADMIN" })], { session });
    expect(session.endSession).toHaveBeenCalled();
  });

  it("chooses a suffixed slug after a collision", async () => {
    mocks.weddingExists
      .mockImplementationOnce(() => query({ _id: "taken" }))
      .mockImplementationOnce(() => query(null));
    await createWedding("user-1", input);
    expect(mocks.weddingExists).toHaveBeenNthCalledWith(2, { "website.slug": "liya-john-doe-20270214-2" });
  });

  it("uses a safe fallback when both names have no URL-safe characters", async () => {
    await createWedding("user-1", { ...input, brideName: "☃", groomName: "🎉" });

    expect(mocks.weddingExists).toHaveBeenCalledWith({ "website.slug": "our-big-day-20270214" });
  });

  it("fails safely when every candidate wedding address is already reserved", async () => {
    mocks.weddingExists.mockImplementation(() => query({ _id: "taken" }));

    await expect(createWedding("user-1", input)).rejects.toMatchObject({
      code: "CONFLICT",
      message: "We could not reserve a wedding address. Please try again.",
      status: 409,
    });
    expect(mocks.weddingExists).toHaveBeenCalledTimes(100);
  });

  it("rejects a user that already owns a wedding", async () => {
    mocks.membershipExists.mockImplementation(() => query({ _id: "membership" }));
    await expect(createWedding("user-1", input)).rejects.toMatchObject({ code: "ALREADY_HAS_WEDDING", status: 409 });
    expect(session.endSession).toHaveBeenCalled();
  });

  it("maps duplicate-key collisions to the correct conflict", async () => {
    mocks.weddingCreate.mockRejectedValue({ code: 11000, keyPattern: { userId: 1 } });
    await expect(createWedding("user-1", input)).rejects.toMatchObject({ code: "ALREADY_HAS_WEDDING" });

    mocks.weddingCreate.mockRejectedValue({ code: 11000, keyPattern: { "website.slug": 1 } });
    await expect(createWedding("user-1", input)).rejects.toMatchObject({ code: "CONFLICT" });
  });

  it("propagates application and unexpected transaction errors and detects an incomplete transaction", async () => {
    const appFailure = new (await import("@/shared/errors/app-error")).AppError("FORBIDDEN", "No", 403);
    session.withTransaction.mockImplementationOnce(async () => { throw appFailure; });
    await expect(createWedding("user-1", input)).rejects.toBe(appFailure);

    const failure = new Error("database write failed");
    mocks.weddingCreate.mockRejectedValue(failure);
    await expect(createWedding("user-1", input)).rejects.toBe(failure);

    mocks.weddingCreate.mockResolvedValue([{
      _id: { toString: () => "wedding-1" }, brideName: "Liya", groomName: "John", weddingDate: "2027-02-14", website: { slug: "liya-john-20270214" },
    }]);
    session.withTransaction.mockImplementationOnce(async () => undefined);
    await expect(createWedding("user-1", input)).rejects.toThrow("Wedding creation did not complete");
  });
});
