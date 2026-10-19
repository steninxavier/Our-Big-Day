import { Types } from "mongoose";
import { EventModel } from "@/modules/events/models/event.model";
import { WeddingMembershipModel } from "@/modules/members/models/wedding-membership.model";
import { WeddingModel } from "@/modules/weddings/models/wedding.model";
import { connectToDatabase } from "@/server/db/mongoose";
import { AppError } from "@/shared/errors/app-error";
import { GuestModel, type WeddingGuest } from "./models/guest.model";
import type { GuestInput, GuestQuery } from "./schemas";

const notFound = () => new AppError("NOT_FOUND", "Guest not found.", 404);
const conflict = () => new AppError("CONFLICT", "This guest changed. Close the form and reopen it to review the latest version.", 409);
async function membershipFor(userId: string) {
  await connectToDatabase();
  const member = await WeddingMembershipModel.findOne({ userId }).lean().exec();
  if (!member || !(await WeddingModel.exists({ _id: member.weddingId, deletedAt: null }))) throw new AppError("FORBIDDEN", "Wedding membership is required.", 403);
  if (member.role !== "ADMIN" && member.role !== "MANAGER") throw new AppError("FORBIDDEN", "Only admins and managers can manage guests.", 403);
  return member;
}
type GuestRecord = WeddingGuest & { _id: Types.ObjectId };
async function enrich(guests: GuestRecord[], weddingId: Types.ObjectId) {
  const ids = guests.flatMap((guest) => guest.invitedEventIds);
  const events = await EventModel.find({ weddingId, _id: { $in: ids } }).select("name startsAt archivedAt").lean().exec();
  const byId = new Map<string, { id: string; name: string; startsAt: string; archivedAt: string | null }>(events.map((event: { _id: Types.ObjectId; name: string; startsAt: Date; archivedAt?: Date | null }) => [event._id.toString(), { id: event._id.toString(), name: event.name, startsAt: event.startsAt.toISOString(), archivedAt: event.archivedAt?.toISOString() ?? null }]));
  return guests.map((guest) => ({ id: guest._id.toString(), name: guest.name, email: guest.email ?? "", phone: guest.phone ?? "", notes: guest.notes ?? "", maxGuests: guest.maxGuests, invitedEventIds: guest.invitedEventIds.map((id) => id.toString()), invitedEvents: guest.invitedEventIds.map((id) => byId.get(id.toString()) ?? { id: id.toString(), name: "Unavailable event", startsAt: "", archivedAt: null }), rsvpStatus: guest.rsvpStatus, numberAttending: guest.numberAttending ?? null, invitationSentAt: guest.invitationSentAt?.toISOString() ?? null, lastReminderSentAt: guest.lastReminderSentAt?.toISOString() ?? null, reminderCount: guest.reminderCount ?? 0, revision: guest.revision ?? 0 }));
}
async function validateEvents(weddingId: Types.ObjectId, ids: string[], old: Types.ObjectId[] = []) {
  const retained = new Set(old.map((id) => id.toString()));
  const added = ids.filter((id) => !retained.has(id.toLowerCase()));
  if (added.length && await EventModel.countDocuments({ _id: { $in: added }, weddingId, archivedAt: null }).exec() !== added.length) throw new AppError("VALIDATION_ERROR", "Select active events in this wedding.", 400);
}
export async function listGuests(userId: string, query: GuestQuery) {
  const member = await membershipFor(userId);
  const filters: Record<string, unknown>[] = [{ weddingId: member.weddingId }];
  if (query.search) { const text = query.search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); filters.push({ $or: ["name", "email", "phone"].map((field) => ({ [field]: { $regex: text, $options: "i" } })) }); }
  if (query.rsvpStatus) filters.push({ rsvpStatus: query.rsvpStatus });
  if (query.eventId) filters.push({ invitedEventIds: new Types.ObjectId(query.eventId) });
  if (query.invitationSent) filters.push({ invitationSentAt: query.invitationSent === "true" ? { $ne: null } : null });
  const filter = { $and: filters };
  const [guests, total, stats] = await Promise.all([
    GuestModel.find(filter).sort({ name: 1, _id: 1 }).skip((query.page - 1) * query.limit).limit(query.limit).lean().exec(),
    GuestModel.countDocuments(filter).exec(),
    GuestModel.aggregate([{ $match: { weddingId: member.weddingId } }, { $group: { _id: "$rsvpStatus", count: { $sum: 1 }, capacity: { $sum: "$maxGuests" }, attending: { $sum: { $ifNull: ["$numberAttending", 0] } } } }]),
  ]);
  const summary = { total: 0, capacity: 0, pending: 0, attending: 0, notAttending: 0, confirmedAttendees: 0 };
  for (const row of stats as { _id: string; count: number; capacity: number; attending: number }[]) { summary.total += row.count; summary.capacity += row.capacity; summary.confirmedAttendees += row.attending; if (row._id === "PENDING") summary.pending += row.count; if (row._id === "ATTENDING") summary.attending += row.count; if (row._id === "NOT_ATTENDING") summary.notAttending += row.count; }
  return { data: await enrich(guests, member.weddingId), pagination: { page: query.page, limit: query.limit, total, totalPages: Math.ceil(total / query.limit) }, summary };
}
export async function getGuest(userId: string, guestId: string) {
  const member = await membershipFor(userId);
  if (!Types.ObjectId.isValid(guestId)) throw notFound();
  const guest = await GuestModel.findOne({ _id: guestId, weddingId: member.weddingId }).lean().exec();
  if (!guest) throw notFound();
  return (await enrich([guest], member.weddingId))[0];
}
export async function createGuest(userId: string, input: GuestInput) {
  const member = await membershipFor(userId);
  await validateEvents(member.weddingId, input.invitedEventIds);
  const guest = await GuestModel.create({ ...input, weddingId: member.weddingId });
  return (await enrich([guest.toObject()], member.weddingId))[0];
}
export async function patchGuest(userId: string, guestId: string, changes: Partial<GuestInput>, expectedRevision: number) {
  const member = await membershipFor(userId);
  if (!Types.ObjectId.isValid(guestId)) throw notFound();
  const previous = await GuestModel.findOne({ _id: guestId, weddingId: member.weddingId }).lean().exec();
  if (!previous) throw notFound();
  if ((previous.revision ?? 0) !== expectedRevision) throw conflict();
  if (changes.maxGuests !== undefined && previous.numberAttending != null && changes.maxGuests < previous.numberAttending) throw new AppError("VALIDATION_ERROR", "The maximum cannot be less than the number already attending.", 400);
  if (changes.invitedEventIds) await validateEvents(member.weddingId, changes.invitedEventIds, previous.invitedEventIds);
  const rev = expectedRevision === 0 ? { $or: [{ revision: 0 }, { revision: { $exists: false } }] } : { revision: expectedRevision };
  const capacity = changes.maxGuests === undefined ? {} : { $and: [{ $or: [{ numberAttending: null }, { numberAttending: { $lte: changes.maxGuests } }] }] };
  const emailChanged = changes.email !== undefined && changes.email !== previous.email;
  const emailGuard = emailChanged ? { $and: [...(capacity.$and ?? []), { $or: [{ emailSendLockExpiresAt: null }, { emailSendLockExpiresAt: { $lte: new Date() } }] }] } : capacity;
  const updated = await GuestModel.findOneAndUpdate({ _id: guestId, weddingId: member.weddingId, ...rev, ...emailGuard }, { $set: emailChanged ? { ...changes, invitationSentAt: null, lastReminderSentAt: null, reminderCount: 0 } : changes, $inc: { revision: 1 } }, { new: true, runValidators: true }).lean().exec();
  if (!updated) throw conflict();
  return (await enrich([updated], member.weddingId))[0];
}
export async function deleteGuest(userId: string, guestId: string) {
  const member = await membershipFor(userId);
  if (!Types.ObjectId.isValid(guestId)) throw notFound();
  const result = await GuestModel.deleteOne({ _id: guestId, weddingId: member.weddingId, $or: [{ emailSendLockExpiresAt: null }, { emailSendLockExpiresAt: { $lte: new Date() } }] }).exec();
  if (!result.deletedCount) {
    if (await GuestModel.exists({ _id: guestId, weddingId: member.weddingId })) throw new AppError("CONFLICT", "An email is being sent to this guest. Please try again shortly.", 409);
    throw notFound();
  }
}
