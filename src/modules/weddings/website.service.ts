import { Types } from "mongoose";

import { EventModel } from "@/modules/events/models/event.model";
import { WeddingMembershipModel } from "@/modules/members/models/wedding-membership.model";
import { connectToDatabase } from "@/server/db/mongoose";
import { AppError } from "@/shared/errors/app-error";

import { WeddingModel, type Wedding } from "./models/wedding.model";
import type { WebsiteSettingsPatch } from "./website.schemas";

const notFound = () => new AppError("NOT_FOUND", "Wedding website not found.", 404);

async function managerMembership(userId: string) {
  await connectToDatabase();
  const membership = await WeddingMembershipModel.findOne({ userId }).lean().exec();
  if (!membership || !(await WeddingModel.exists({ _id: membership.weddingId, deletedAt: null }))) throw new AppError("FORBIDDEN", "Wedding membership is required.", 403);
  if (membership.role !== "ADMIN" && membership.role !== "MANAGER") throw new AppError("FORBIDDEN", "Only admins and managers can manage the wedding website.", 403);
  return membership;
}

type WebsiteWedding = Wedding & { _id: Types.ObjectId };
function settings(wedding: WebsiteWedding) {
  return {
    slug: wedding.website.slug,
    theme: wedding.website.theme,
    isPublished: wedding.website.isPublished,
    welcomeMessage: wedding.website.welcomeMessage ?? "",
  };
}

export async function getWebsiteSettings(userId: string) {
  const membership = await managerMembership(userId);
  const wedding = await WeddingModel.findOne({ _id: membership.weddingId, deletedAt: null }).lean().exec();
  if (!wedding) throw notFound();
  return settings(wedding);
}

export async function updateWebsiteSettings(userId: string, input: WebsiteSettingsPatch) {
  const membership = await managerMembership(userId);
  const update: Record<string, unknown> = {};
  if (input.theme !== undefined) update["website.theme"] = input.theme;
  if (input.isPublished !== undefined) update["website.isPublished"] = input.isPublished;
  if (input.welcomeMessage !== undefined) update["website.welcomeMessage"] = input.welcomeMessage;
  const wedding = await WeddingModel.findOneAndUpdate({ _id: membership.weddingId, deletedAt: null }, { $set: update }, { new: true, runValidators: true }).lean().exec();
  if (!wedding) throw notFound();
  return settings(wedding);
}

export async function getPublicWeddingWebsite(slug: string) {
  await connectToDatabase();
  const wedding = await WeddingModel.findOne({ "website.slug": slug, "website.isPublished": true, deletedAt: null }).lean().exec();
  if (!wedding) throw notFound();
  const events = await EventModel.find({ weddingId: wedding._id, archivedAt: null }).sort({ startsAt: 1, _id: 1 }).lean().exec();
  return {
    brideName: wedding.brideName,
    groomName: wedding.groomName,
    title: wedding.title?.trim() || `${wedding.brideName} & ${wedding.groomName}`,
    description: wedding.description ?? "",
    weddingDate: wedding.weddingDate,
    timeZone: wedding.timeZone,
    location: wedding.location?.formattedAddress || wedding.location?.city || "",
    theme: wedding.website.theme,
    welcomeMessage: wedding.website.welcomeMessage ?? "",
    gallery: { enabled: wedding.gallery.isEnabled },
    livestream: {
      enabled: wedding.livestream.isEnabled && Boolean(wedding.livestream.youtubeUrl),
      youtubeUrl: wedding.livestream.isEnabled ? wedding.livestream.youtubeUrl ?? null : null,
    },
    events: events.map((event) => ({ id: event._id.toString(), name: event.name, startsAt: event.startsAt.toISOString(), endsAt: event.endsAt?.toISOString() ?? null, venueName: event.venueName ?? "", address: event.address ?? "", description: event.description ?? "", dressCode: event.dressCode ?? "" })),
  };
}
