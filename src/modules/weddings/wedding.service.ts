import type { ClientSession } from "mongoose";

import { WeddingMembershipModel } from "@/modules/members/models/wedding-membership.model";
import { createOpaqueToken, hashOpaqueToken } from "@/server/auth/tokens";
import { connectToDatabase } from "@/server/db/mongoose";
import { AppError } from "@/shared/errors/app-error";

import { WeddingModel } from "./models/wedding.model";
import type { CreateWeddingInput } from "./schemas";

const MAX_SLUG_ATTEMPTS = 100;

type CreatedWedding = {
  id: string;
  brideName: string;
  groomName: string;
  weddingDate: string;
  website: {
    slug: string;
  };
};

function slugSegment(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function initialSlug(input: CreateWeddingInput) {
  const names = [slugSegment(input.brideName), slugSegment(input.groomName)].filter(Boolean).join("-");
  const date = input.weddingDate.replaceAll("-", "");

  return `${names || "our-big-day"}-${date}`;
}

async function nextAvailableSlug(baseSlug: string, session: ClientSession) {
  for (let attempt = 0; attempt < MAX_SLUG_ATTEMPTS; attempt += 1) {
    const suffix = attempt === 0 ? "" : `-${attempt + 1}`;
    const candidate = `${baseSlug}${suffix}`;
    const existing = await WeddingModel.exists({ "website.slug": candidate }).session(session);

    if (!existing) {
      return candidate;
    }
  }

  throw new AppError("CONFLICT", "We could not reserve a wedding address. Please try again.", 409);
}

function isDuplicateKeyError(error: unknown): error is { code: number; keyPattern?: Record<string, number> } {
  return typeof error === "object" && error !== null && "code" in error && error.code === 11000;
}

export async function createWedding(userId: string, input: CreateWeddingInput): Promise<CreatedWedding> {
  const connection = await connectToDatabase();
  const session = await connection.startSession();

  try {
    let createdWedding: CreatedWedding | null = null;

    await session.withTransaction(async () => {
      const existingMembership = await WeddingMembershipModel.exists({ userId }).session(session);

      if (existingMembership) {
        throw new AppError("ALREADY_HAS_WEDDING", "You already have a wedding space.", 409);
      }

      const slug = await nextAvailableSlug(initialSlug(input), session);
      const galleryToken = createOpaqueToken();
      const [wedding] = await WeddingModel.create(
        [
          {
            ...input,
            website: {
              slug,
              theme: "MINIMAL_ELEGANT",
              isPublished: false,
            },
            gallery: {
              tokenHash: hashOpaqueToken(galleryToken),
              isEnabled: true,
              guestUploadsEnabled: true,
            },
            livestream: {
              isEnabled: false,
            },
            createdByUserId: userId,
          },
        ],
        { session },
      );

      await WeddingMembershipModel.create(
        [
          {
            userId,
            weddingId: wedding._id,
            role: "ADMIN",
            joinedAt: new Date(),
          },
        ],
        { session },
      );

      createdWedding = {
        id: wedding._id.toString(),
        brideName: wedding.brideName,
        groomName: wedding.groomName,
        weddingDate: wedding.weddingDate,
        website: { slug: wedding.website.slug },
      };
    });

    if (!createdWedding) {
      throw new Error("Wedding creation did not complete.");
    }

    return createdWedding;
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }

    if (isDuplicateKeyError(error)) {
      if (error.keyPattern?.userId) {
        throw new AppError("ALREADY_HAS_WEDDING", "You already have a wedding space.", 409);
      }

      throw new AppError("CONFLICT", "We could not create your wedding. Please try again.", 409);
    }

    throw error;
  } finally {
    await session.endSession();
  }
}
