import { randomBytes } from "node:crypto";
import { Types } from "mongoose";
import { EventModel } from "@/modules/events/models/event.model";
import { WeddingMembershipModel } from "@/modules/members/models/wedding-membership.model";
import { WeddingModel } from "@/modules/weddings/models/wedding.model";
import { connectToDatabase } from "@/server/db/mongoose";
import { AppError } from "@/shared/errors/app-error";
import { GuestModel } from "./models/guest.model";
import { limitRsvp } from "./rsvp-rate";
import type { RsvpInput } from "./rsvp.schemas";

const unavailable = () => new AppError("NOT_FOUND", "This invitation is unavailable.", 404);
const validToken = (token: string) => /^[A-Za-z0-9_-]{43}$/.test(token);
function applicationOrigin() {
  try {
    const url = new URL(process.env.APP_URL ?? "");
    if (url.username || url.password || !(["https:", "http:"].includes(url.protocol)) || (url.protocol === "http:" && !["localhost", "127.0.0.1"].includes(url.hostname))) throw new Error();
    return url.origin;
  } catch { throw new AppError("CONFIGURATION_ERROR", "The application address is not configured for invitation links.", 503); }
}
export async function getOrCreateInvitationLink(userId: string, guestId: string) {
  const origin = applicationOrigin();
  await connectToDatabase();
  const member = await WeddingMembershipModel.findOne({ userId }).lean().exec();
  if (!member || !["ADMIN", "MANAGER"].includes(member.role) || !(await WeddingModel.exists({ _id: member.weddingId, deletedAt: null }))) throw new AppError("FORBIDDEN", "Only admins and managers can share guest invitations.", 403);
  if (!Types.ObjectId.isValid(guestId)) throw unavailable();
  let guest = await GuestModel.findOne({ _id: guestId, weddingId: member.weddingId }).select("+invitationToken").lean().exec();
  if (!guest) throw unavailable();
  if (!guest.invitationToken) {
    const token = randomBytes(32).toString("base64url");
    guest = await GuestModel.findOneAndUpdate({ _id: guestId, weddingId: member.weddingId, invitationToken: { $exists: false } }, { $set: { invitationToken: token } }, { returnDocument: "after" }).select("+invitationToken").lean().exec();
    if (!guest) guest = await GuestModel.findOne({ _id: guestId, weddingId: member.weddingId }).select("+invitationToken").lean().exec();
  }
  if (!guest?.invitationToken) throw unavailable();
  return { url: `${origin}/invite/${guest.invitationToken}`, localOnly: ["localhost", "127.0.0.1"].includes(new URL(origin).hostname) };
}
async function resolve(token: string) {
  if (!validToken(token)) throw unavailable();
  await connectToDatabase();
  const guest = await GuestModel.findOne({ invitationToken: token }).select("name weddingId maxGuests invitedEventIds rsvpStatus numberAttending revision rsvpUpdatedAt").lean().exec();
  if (!guest) throw unavailable();
  const wedding = await WeddingModel.findOne({ _id: guest.weddingId, deletedAt: null }).select("brideName groomName title weddingDate timeZone location.formattedAddress").lean().exec();
  if (!wedding) throw unavailable();
  return { guest, wedding };
}
export async function getInvitation(token: string) {
  const { guest, wedding } = await resolve(token);
  const events = await EventModel.find({ _id: { $in: guest.invitedEventIds }, weddingId: guest.weddingId, archivedAt: null }).select("name startsAt endsAt venueName address dressCode description").sort({ startsAt: 1, _id: 1 }).lean().exec();
  return { guest: { name: guest.name, maxGuests: guest.maxGuests, status: guest.rsvpStatus, attendingCount: guest.numberAttending ?? null }, wedding: { brideName: wedding.brideName, groomName: wedding.groomName, title: wedding.title ?? "", weddingDate: wedding.weddingDate, timeZone: wedding.timeZone, location: wedding.location?.formattedAddress ?? "" }, events: events.map((event: { name: string; startsAt: Date; endsAt?: Date | null; venueName?: string; address?: string; dressCode?: string; description?: string }) => ({ name: event.name, startsAt: event.startsAt.toISOString(), endsAt: event.endsAt?.toISOString() ?? null, venueName: event.venueName ?? "", address: event.address ?? "", dressCode: event.dressCode ?? "", description: event.description ?? "" })) };
}
export async function submitRsvp(token: string, input: RsvpInput) {
  const { guest } = await resolve(token);
  if (input.attendingCount > guest.maxGuests) throw new AppError("PARTY_SIZE_CHANGED", "The number attending exceeds your invitation allowance.", 400);
  await limitRsvp(token);
  if (guest.rsvpStatus === input.status && guest.numberAttending === input.attendingCount) return { status: guest.rsvpStatus, attendingCount: guest.numberAttending, updatedAt: guest.rsvpUpdatedAt?.toISOString() ?? null };
  const revision = guest.revision ?? 0;
  const rev = revision === 0 ? { $or: [{ revision: 0 }, { revision: { $exists: false } }] } : { revision };
  const updated = await GuestModel.findOneAndUpdate({ _id: guest._id, weddingId: guest.weddingId, invitationToken: token, maxGuests: { $gte: input.attendingCount }, ...rev }, { $set: { rsvpStatus: input.status, numberAttending: input.attendingCount, rsvpUpdatedAt: new Date() }, $inc: { revision: 1 } }, { returnDocument: "after" }).lean().exec();
  if (!updated) throw new AppError("CONFLICT", "Your invitation changed. Please review the latest details and try again.", 409);
  return { status: updated.rsvpStatus, attendingCount: updated.numberAttending, updatedAt: updated.rsvpUpdatedAt?.toISOString() ?? null };
}
