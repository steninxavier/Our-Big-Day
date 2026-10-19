import bcrypt from "bcryptjs";

import { WeddingMembershipModel } from "@/modules/members/models/wedding-membership.model";
import { WeddingModel } from "@/modules/weddings/models/wedding.model";
import { connectToDatabase } from "@/server/db/mongoose";
import { createOpaqueToken, hashOpaqueToken } from "@/server/auth/tokens";
import { AppError, invalidCredentials, unauthenticated } from "@/shared/errors/app-error";

import { SessionModel } from "./models/session.model";
import { UserModel } from "./models/user.model";
import type { LoginInput, SignUpInput } from "./schemas";

const SESSION_DURATION_MS = 1000 * 60 * 60 * 24 * 30;

type SafeUser = {
  id: string;
  name: string;
  email: string;
};

type AuthResult = {
  user: SafeUser;
  hasWedding: boolean;
  sessionToken: string;
};

function toSafeUser(user: { _id: { toString(): string }; name: string; email: string }): SafeUser {
  return { id: user._id.toString(), name: user.name, email: user.email };
}

async function createSession(userId: string) {
  const token = createOpaqueToken();
  await SessionModel.create({
    userId,
    tokenHash: hashOpaqueToken(token),
    expiresAt: new Date(Date.now() + SESSION_DURATION_MS),
  });
  return token;
}

async function hasWeddingMembership(userId: string) {
  return Boolean(await WeddingMembershipModel.exists({ userId }));
}

export async function signUp(input: SignUpInput): Promise<AuthResult> {
  await connectToDatabase();

  const emailNormalized = input.email.toLowerCase();
  if (await UserModel.exists({ emailNormalized })) {
    throw new AppError("CONFLICT", "An account with that email already exists.", 409);
  }

  try {
    const user = await UserModel.create({
      name: input.name,
      email: input.email,
      emailNormalized,
      passwordHash: await bcrypt.hash(input.password, 12),
    });
    const sessionToken = await createSession(user._id.toString());

    return { user: toSafeUser(user), hasWedding: false, sessionToken };
  } catch (error) {
    if (isDuplicateKeyError(error)) {
      throw new AppError("CONFLICT", "An account with that email already exists.", 409);
    }
    throw error;
  }
}

export async function login(input: LoginInput): Promise<AuthResult> {
  await connectToDatabase();

  const user = await UserModel.findOne({ emailNormalized: input.email.toLowerCase() })
    .select("+passwordHash")
    .exec();
  if (!user || !(await bcrypt.compare(input.password, user.passwordHash))) {
    throw invalidCredentials();
  }

  const sessionToken = await createSession(user._id.toString());
  return {
    user: toSafeUser(user),
    hasWedding: await hasWeddingMembership(user._id.toString()),
    sessionToken,
  };
}

export async function logout(sessionToken: string | undefined) {
  if (!sessionToken) {
    throw unauthenticated();
  }

  await connectToDatabase();
  await SessionModel.deleteOne({ tokenHash: hashOpaqueToken(sessionToken) });
}

export async function getCurrentUser(sessionToken: string | undefined) {
  if (!sessionToken) {
    throw unauthenticated();
  }

  await connectToDatabase();
  const session = await SessionModel.findOne({
    tokenHash: hashOpaqueToken(sessionToken),
    expiresAt: { $gt: new Date() },
  }).exec();
  if (!session) {
    throw unauthenticated();
  }

  const user = await UserModel.findById(session.userId).exec();
  if (!user) {
    throw unauthenticated();
  }

  const membership = await WeddingMembershipModel.findOne({ userId: user._id }).exec();
  if (!membership) {
    return { user: toSafeUser(user), membership: null, wedding: null };
  }

  const wedding = await WeddingModel.findById(membership.weddingId).exec();
  if (!wedding || wedding.deletedAt) {
    return { user: toSafeUser(user), membership: null, wedding: null };
  }

  return {
    user: toSafeUser(user),
    membership: { id: membership._id.toString(), role: membership.role },
    wedding: {
      id: wedding._id.toString(),
      brideName: wedding.brideName,
      groomName: wedding.groomName,
      weddingDate: wedding.weddingDate,
      timeZone: wedding.timeZone,
    },
  };
}

function isDuplicateKeyError(error: unknown): error is { code: number } {
  return typeof error === "object" && error !== null && "code" in error && error.code === 11000;
}
