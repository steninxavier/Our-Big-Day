import { Types } from "mongoose";
import { WeddingMembershipModel } from "@/modules/members/models/wedding-membership.model";
import { WeddingModel } from "@/modules/weddings/models/wedding.model";
import { connectToDatabase } from "@/server/db/mongoose";
import { AppError } from "@/shared/errors/app-error";
import { EventModel } from "./models/event.model";
import { eventSchema, type EventInput } from "./schemas";

const notFound = () => new AppError("NOT_FOUND", "Event not found.", 404);
async function membershipFor(userId: string) {
  await connectToDatabase();
  const member = await WeddingMembershipModel.findOne({ userId }).lean().exec();
  if (!member || !(await WeddingModel.exists({ _id: member.weddingId, deletedAt: null }))) throw new AppError("FORBIDDEN", "Wedding membership is required.", 403);
  return member;
}
function requireManager(role: string) {
  if (role !== "ADMIN" && role !== "MANAGER") throw new AppError("FORBIDDEN", "Only admins and managers can manage events.", 403);
}
function serialize(event: { _id: Types.ObjectId; name: string; type?: string; startsAt: Date; endsAt?: Date | null; venueName?: string; address?: string; description?: string; dressCode?: string; coordinatorIds: Types.ObjectId[] }) {
  return { id: event._id.toString(), name: event.name, type: event.type ?? "CUSTOM", startsAt: event.startsAt.toISOString(), endsAt: event.endsAt?.toISOString() ?? null, venueName: event.venueName ?? "", address: event.address ?? "", description: event.description ?? "", dressCode: event.dressCode ?? "", coordinatorIds: event.coordinatorIds.map((id) => id.toString()) };
}
export async function listEvents(userId: string) {
  const member = await membershipFor(userId);
  const filter = { weddingId: member.weddingId, archivedAt: null, ...(member.role === "EVENT_COORDINATOR" ? { coordinatorIds: member._id } : {}) };
  if (!["ADMIN", "MANAGER", "EVENT_COORDINATOR"].includes(member.role)) throw new AppError("FORBIDDEN", "Access denied.", 403);
  const events = await EventModel.find(filter).sort({ startsAt: 1, _id: 1 }).lean().exec();
  return events.map((event: Parameters<typeof serialize>[0]) => { const result = serialize(event); return member.role === "EVENT_COORDINATOR" ? { ...result, coordinatorIds: [member._id.toString()] } : result; });
}
export function upcomingEventsOnly<T extends { startsAt: string }>(events: T[]) {
  const now = Date.now();
  return events.filter((event) => new Date(event.startsAt).getTime() >= now);
}
export async function getEvent(userId: string, eventId: string) {
  const events = await listEvents(userId);
  const event = events.find((item: { id: string }) => item.id === eventId);
  if (!event) throw notFound();
  return event;
}
async function validateCoordinators(weddingId: Types.ObjectId, ids: string[]) {
  const unique = [...new Set(ids)];
  const count = await WeddingMembershipModel.countDocuments({ _id: { $in: unique }, weddingId, role: "EVENT_COORDINATOR" }).exec();
  if (count !== unique.length) throw new AppError("VALIDATION_ERROR", "Select only coordinators in this wedding.", 400);
  return unique;
}
export async function createEvent(userId: string, input: EventInput) {
  const member = await membershipFor(userId); requireManager(member.role);
  const coordinatorIds = await validateCoordinators(member.weddingId, input.coordinatorIds);
  const event = await EventModel.create({ ...input, weddingId: member.weddingId, coordinatorIds });
  return serialize(event);
}
export async function patchEvent(userId: string, eventId: string, changes: Partial<EventInput>) {
  const member = await membershipFor(userId); requireManager(member.role);
  if (!Types.ObjectId.isValid(eventId)) throw notFound();
  const previous = await EventModel.findOne({ _id: eventId, weddingId: member.weddingId, archivedAt: null }).exec();
  if (!previous) throw notFound();
  const { id: _id, ...previousValues } = serialize(previous);
  void _id;
  const merged = eventSchema.parse({ ...previousValues, ...changes });
  const coordinatorIds = await validateCoordinators(member.weddingId, merged.coordinatorIds);
  const updated = await EventModel.findOneAndUpdate({ _id: eventId, weddingId: member.weddingId, archivedAt: null, updatedAt: previous.updatedAt }, { $set: { ...merged, coordinatorIds } }, { new: true, runValidators: true }).exec();
  if (!updated) throw new AppError("CONFLICT", "The event changed. Reload it and try again.", 409);
  return serialize(updated);
}
export async function archiveEvent(userId: string, eventId: string) {
  const member = await membershipFor(userId); requireManager(member.role);
  if (!Types.ObjectId.isValid(eventId)) throw notFound();
  const result = await EventModel.updateOne({ _id: eventId, weddingId: member.weddingId, archivedAt: null }, { $set: { archivedAt: new Date() } }).exec();
  if (!result.modifiedCount) throw notFound();
}
