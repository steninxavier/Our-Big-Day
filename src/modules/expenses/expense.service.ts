import { Types } from "mongoose";
import { EventModel } from "@/modules/events/models/event.model";
import { WeddingMembershipModel } from "@/modules/members/models/wedding-membership.model";
import { WeddingModel } from "@/modules/weddings/models/wedding.model";
import { connectToDatabase } from "@/server/db/mongoose";
import { AppError } from "@/shared/errors/app-error";
import { ExpenseModel, type WeddingExpense } from "./models/expense.model";
import type { ExpenseInput, ExpenseQuery } from "./schemas";

const notFound = () => new AppError("NOT_FOUND", "Expense not found.", 404);
const conflict = () => new AppError("CONFLICT", "This expense changed. Close the form and reopen it to review the latest version.", 409);
async function membershipFor(userId: string) {
  await connectToDatabase();
  const member = await WeddingMembershipModel.findOne({ userId }).lean().exec();
  if (!member || !(await WeddingModel.exists({ _id: member.weddingId, deletedAt: null }))) throw new AppError("FORBIDDEN", "Wedding membership is required.", 403);
  if (member.role !== "ADMIN" && member.role !== "MANAGER") throw new AppError("FORBIDDEN", "Only admins and managers can access expenses.", 403);
  return member;
}
type ExpenseRecord = WeddingExpense & { _id: Types.ObjectId };
function serialize(expense: ExpenseRecord) {
  return { id: expense._id.toString(), title: expense.title, amountPaise: expense.amountPaise, currency: expense.currency, expenseDate: expense.expenseDate.toISOString().slice(0, 10), category: expense.category, eventId: expense.eventId?.toString() ?? null, notes: expense.notes ?? "", revision: expense.revision ?? 0 };
}
async function validateEvent(weddingId: Types.ObjectId, eventId: string | null | undefined, previous?: Types.ObjectId | null) {
  if (eventId && eventId.toLowerCase() !== previous?.toString() && !(await EventModel.exists({ _id: eventId, weddingId, archivedAt: null }))) throw new AppError("VALIDATION_ERROR", "Select an active event in this wedding.", 400);
}
export async function listExpenseEvents(userId: string) {
  const member = await membershipFor(userId);
  const events = await EventModel.find({ weddingId: member.weddingId }).select("name archivedAt").sort({ name: 1, _id: 1 }).lean().exec();
  return events.map((event: { _id: Types.ObjectId; name: string; archivedAt?: Date | null }) => ({ id: event._id.toString(), name: event.name, archived: Boolean(event.archivedAt) }));
}
export async function listExpenses(userId: string, query: ExpenseQuery) {
  const member = await membershipFor(userId);
  const filter: Record<string, unknown> = { weddingId: member.weddingId };
  if (query.category) filter.category = query.category;
  if (query.eventId) filter.eventId = new Types.ObjectId(query.eventId);
  if (query.search) filter.title = { $regex: query.search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), $options: "i" };
  if (query.from || query.to) filter.expenseDate = { ...(query.from ? { $gte: new Date(`${query.from}T00:00:00Z`) } : {}), ...(query.to ? { $lte: new Date(`${query.to}T00:00:00Z`) } : {}) };
  const [expenses, total] = await Promise.all([ExpenseModel.find(filter).sort({ expenseDate: -1, _id: -1 }).skip((query.page - 1) * query.limit).limit(query.limit).lean().exec(), ExpenseModel.countDocuments(filter).exec()]);
  return { data: expenses.map(serialize), pagination: { page: query.page, limit: query.limit, total, totalPages: Math.ceil(total / query.limit) } };
}
export async function expenseSummary(userId: string) {
  const member = await membershipFor(userId);
  const rows = await ExpenseModel.aggregate([{ $match: { weddingId: member.weddingId } }, { $group: { _id: "$category", total: { $sum: "$amountPaise" }, count: { $sum: 1 } } }, { $sort: { total: -1 } }]);
  const byCategory = (rows as { _id: string; total: number; count: number }[]).map((row) => ({ category: row._id, amountPaise: row.total, count: row.count }));
  return { totalExpensePaise: byCategory.reduce((sum, row) => sum + row.amountPaise, 0), currency: "INR", count: byCategory.reduce((sum, row) => sum + row.count, 0), byCategory };
}
export async function getExpense(userId: string, expenseId: string) {
  const member = await membershipFor(userId); if (!Types.ObjectId.isValid(expenseId)) throw notFound();
  const expense = await ExpenseModel.findOne({ _id: expenseId, weddingId: member.weddingId }).lean().exec(); if (!expense) throw notFound(); return serialize(expense);
}
export async function createExpense(userId: string, input: ExpenseInput) {
  const member = await membershipFor(userId); await validateEvent(member.weddingId, input.eventId);
  const expense = await ExpenseModel.create({ ...input, expenseDate: new Date(`${input.expenseDate}T00:00:00Z`), weddingId: member.weddingId, createdByMembershipId: member._id }); return serialize(expense.toObject());
}
export async function patchExpense(userId: string, expenseId: string, changes: Partial<ExpenseInput>, expectedRevision: number) {
  const member = await membershipFor(userId); if (!Types.ObjectId.isValid(expenseId)) throw notFound();
  const previous = await ExpenseModel.findOne({ _id: expenseId, weddingId: member.weddingId }).lean().exec(); if (!previous) throw notFound();
  if ((previous.revision ?? 0) !== expectedRevision) throw conflict();
  await validateEvent(member.weddingId, changes.eventId, previous.eventId);
  const updated = await ExpenseModel.findOneAndUpdate({ _id: expenseId, weddingId: member.weddingId, revision: expectedRevision }, { $set: { ...changes, ...(changes.expenseDate ? { expenseDate: new Date(`${changes.expenseDate}T00:00:00Z`) } : {}) }, $inc: { revision: 1 } }, { new: true, runValidators: true }).lean().exec();
  if (!updated) throw conflict(); return serialize(updated);
}
export async function deleteExpense(userId: string, expenseId: string) {
  const member = await membershipFor(userId); if (!Types.ObjectId.isValid(expenseId)) throw notFound();
  const result = await ExpenseModel.deleteOne({ _id: expenseId, weddingId: member.weddingId }).exec(); if (!result.deletedCount) throw notFound();
}
