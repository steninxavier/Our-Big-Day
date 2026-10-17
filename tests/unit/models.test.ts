import mongoose from "mongoose";
import { beforeEach, describe, expect, it, vi } from "vitest";

async function loadModels() {
  const [users, sessions, resetTokens, memberships, weddings] = await Promise.all([
    import("@/modules/auth/models/user.model"),
    import("@/modules/auth/models/session.model"),
    import("@/modules/auth/models/password-reset-token.model"),
    import("@/modules/members/models/wedding-membership.model"),
    import("@/modules/weddings/models/wedding.model"),
  ]);

  return {
    PasswordResetTokenModel: resetTokens.PasswordResetTokenModel,
    SessionModel: sessions.SessionModel,
    UserModel: users.UserModel,
    WeddingMembershipModel: memberships.WeddingMembershipModel,
    WeddingModel: weddings.WeddingModel,
  };
}

describe("Mongoose model definitions", () => {
  beforeEach(() => {
    mongoose.deleteModel(/.+/);
    vi.resetModules();
  });

  it("defines the tenant, identity, token, and session constraints without a database connection", async () => {
    const first = await loadModels();

    expect(first.UserModel.collection.name).toBe("users");
    expect(first.UserModel.schema.path("emailNormalized").options).toMatchObject({ index: true, unique: true });
    expect(first.UserModel.schema.path("passwordHash").options.select).toBe(false);

    expect(first.SessionModel.schema.path("expiresAt").options.index).toEqual({ expires: 0 });
    expect(first.PasswordResetTokenModel.collection.name).toBe("password_reset_tokens");
    expect(first.PasswordResetTokenModel.schema.path("usedAt")).toBeDefined();

    expect(first.WeddingMembershipModel.schema.path("role").options.enum).toEqual(["ADMIN", "MANAGER"]);
    expect(first.WeddingMembershipModel.schema.indexes()).toEqual(expect.arrayContaining([
      [{ weddingId: 1, userId: 1 }, { unique: true }],
      [{ weddingId: 1, role: 1 }, {}],
    ]));

    expect(first.WeddingModel.collection.name).toBe("weddings");
    expect(first.WeddingModel.schema.path("website.slug").options).toMatchObject({ index: true, unique: true });
    expect(first.WeddingModel.schema.path("gallery.tokenHash").options.select).toBe(false);
    expect(first.WeddingModel.schema.path("livestream.isEnabled").options.default).toBe(false);

    vi.resetModules();
    const cached = await loadModels();
    expect(cached.UserModel).toBe(first.UserModel);
    expect(cached.SessionModel).toBe(first.SessionModel);
    expect(cached.PasswordResetTokenModel).toBe(first.PasswordResetTokenModel);
    expect(cached.WeddingMembershipModel).toBe(first.WeddingMembershipModel);
    expect(cached.WeddingModel).toBe(first.WeddingModel);
  });
});
