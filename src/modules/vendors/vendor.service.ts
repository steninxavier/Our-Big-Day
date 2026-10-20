import { Types } from "mongoose";
import { EventModel } from "@/modules/events/models/event.model";
import { WeddingMembershipModel } from "@/modules/members/models/wedding-membership.model";
import { WeddingModel } from "@/modules/weddings/models/wedding.model";
import { connectToDatabase } from "@/server/db/mongoose";
import { AppError } from "@/shared/errors/app-error";
import { VendorModel, type WeddingVendor } from "./models/vendor.model";
import type { VendorInput, VendorQuery } from "./schemas";

const notFound = () => new AppError("NOT_FOUND", "Vendor not found.", 404);
const conflict = () => new AppError("CONFLICT", "This vendor changed. Close the form and reopen it to review the latest version.", 409);
const escapeRegex = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

async function membershipFor(userId: string) {
  await connectToDatabase();
  const member = await WeddingMembershipModel.findOne({ userId }).lean().exec();
  if (!member || !(await WeddingModel.exists({ _id: member.weddingId, deletedAt: null }))) throw new AppError("FORBIDDEN", "Wedding membership is required.", 403);
  if (member.role !== "ADMIN" && member.role !== "MANAGER") throw new AppError("FORBIDDEN", "Only admins and managers can access vendors.", 403);
  return member;
}

type VendorRecord = WeddingVendor & { _id: Types.ObjectId };
function serialize(vendor: VendorRecord) {
  return { id: vendor._id.toString(), name: vendor.name, category: vendor.category, contactPerson: vendor.contactPerson, phone: vendor.phone, email: vendor.email, address: vendor.address, website: vendor.website, totalAgreedCostPaise: vendor.totalAgreedCostPaise, eventIds: vendor.eventIds.map(String), notes: vendor.notes, source: vendor.source, archivedAt: vendor.archivedAt?.toISOString() ?? null, revision: vendor.revision ?? 0 };
}
async function validateEvents(weddingId: Types.ObjectId, eventIds: string[], previous: Types.ObjectId[] = []) {
  const retained = new Set(previous.map(String));
  const newIds = eventIds.filter((id) => !retained.has(id));
  if (!newIds.length) return;
  const valid = await EventModel.countDocuments({ _id: { $in: newIds }, weddingId, archivedAt: null }).exec();
  if (valid !== newIds.length) throw new AppError("VALIDATION_ERROR", "Select active events in this wedding.", 400);
}

export async function listVendorEvents(userId: string) {
  const member = await membershipFor(userId);
  const events = await EventModel.find({ weddingId: member.weddingId }).select("name archivedAt").sort({ name: 1, _id: 1 }).lean().exec();
  return events.map((event: { _id: Types.ObjectId; name: string; archivedAt?: Date | null }) => ({ id: event._id.toString(), name: event.name, archived: Boolean(event.archivedAt) }));
}
export async function listVendors(userId: string, query: VendorQuery) {
  const member = await membershipFor(userId);
  const filter: Record<string, unknown> = { weddingId: member.weddingId, ...(query.includeArchived ? {} : { archivedAt: null }) };
  if (query.category) filter.category = query.category;
  if (query.search) filter.name = { $regex: escapeRegex(query.search), $options: "i" };
  const [vendors, total] = await Promise.all([VendorModel.find(filter).sort({ name: 1, _id: 1 }).skip((query.page - 1) * query.limit).limit(query.limit).lean().exec(), VendorModel.countDocuments(filter).exec()]);
  return { data: vendors.map(serialize), pagination: { page: query.page, limit: query.limit, total, totalPages: Math.ceil(total / query.limit) } };
}
export async function vendorSummary(userId: string) {
  const member = await membershipFor(userId);
  const rows = await VendorModel.aggregate([{ $match: { weddingId: member.weddingId, archivedAt: null } }, { $group: { _id: "$category", count: { $sum: 1 }, total: { $sum: { $ifNull: ["$totalAgreedCostPaise", 0] } } } }, { $sort: { count: -1, _id: 1 } }]);
  const byCategory = rows as { _id: string; count: number; total: number }[];
  return { count: byCategory.reduce((sum, row) => sum + row.count, 0), totalAgreedCostPaise: byCategory.reduce((sum, row) => sum + row.total, 0), categoryCount: byCategory.length, byCategory: byCategory.map((row) => ({ category: row._id, count: row.count })) };
}
export async function getVendor(userId: string, vendorId: string) {
  const member = await membershipFor(userId); if (!Types.ObjectId.isValid(vendorId)) throw notFound();
  const vendor = await VendorModel.findOne({ _id: vendorId, weddingId: member.weddingId }).lean().exec(); if (!vendor) throw notFound(); return serialize(vendor);
}
export async function createVendor(userId: string, input: VendorInput) {
  const member = await membershipFor(userId); await validateEvents(member.weddingId, input.eventIds);
  const vendor = await VendorModel.create({ ...input, weddingId: member.weddingId, eventIds: input.eventIds, source: "MANUAL" }); return serialize(vendor.toObject());
}
export async function patchVendor(userId: string, vendorId: string, changes: Partial<VendorInput>, expectedRevision: number) {
  const member = await membershipFor(userId); if (!Types.ObjectId.isValid(vendorId)) throw notFound();
  const previous = await VendorModel.findOne({ _id: vendorId, weddingId: member.weddingId }).lean().exec(); if (!previous) throw notFound();
  if ((previous.revision ?? 0) !== expectedRevision) throw conflict();
  if (changes.eventIds) await validateEvents(member.weddingId, changes.eventIds, previous.eventIds);
  const updated = await VendorModel.findOneAndUpdate({ _id: vendorId, weddingId: member.weddingId, revision: expectedRevision }, { $set: changes, $inc: { revision: 1 } }, { new: true, runValidators: true }).lean().exec();
  if (!updated) throw conflict(); return serialize(updated);
}
export async function archiveVendor(userId: string, vendorId: string) {
  const member = await membershipFor(userId); if (!Types.ObjectId.isValid(vendorId)) throw notFound();
  const updated = await VendorModel.findOneAndUpdate({ _id: vendorId, weddingId: member.weddingId, archivedAt: null }, { $set: { archivedAt: new Date() }, $inc: { revision: 1 } }, { new: true }).lean().exec();
  if (!updated) throw notFound(); return serialize(updated);
}
