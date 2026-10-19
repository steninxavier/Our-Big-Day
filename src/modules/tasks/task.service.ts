import { Types } from "mongoose";
import { UserModel } from "@/modules/auth/models/user.model";
import { EventModel } from "@/modules/events/models/event.model";
import { WeddingMembershipModel } from "@/modules/members/models/wedding-membership.model";
import { WeddingModel } from "@/modules/weddings/models/wedding.model";
import { connectToDatabase } from "@/server/db/mongoose";
import { AppError } from "@/shared/errors/app-error";
import { TaskModel } from "./models/task.model";
import type { TaskInput, TaskQuery } from "./schemas";

const notFound = () => new AppError("NOT_FOUND", "Task not found.", 404);
async function membershipFor(userId: string) {
  await connectToDatabase();
  const member = await WeddingMembershipModel.findOne({ userId }).lean().exec();
  if (!member || !(await WeddingModel.exists({ _id: member.weddingId, deletedAt: null }))) throw new AppError("FORBIDDEN", "Wedding membership is required.", 403);
  if (!["ADMIN", "MANAGER", "EVENT_COORDINATOR"].includes(member.role)) throw new AppError("FORBIDDEN", "Access denied.", 403);
  return member;
}
function requireManager(role: string) {
  if (role !== "ADMIN" && role !== "MANAGER") throw new AppError("FORBIDDEN", "Only admins and managers can manage tasks.", 403);
}
async function visibleEvents(member: { role: string; weddingId: Types.ObjectId; _id: Types.ObjectId }) {
  if (member.role !== "EVENT_COORDINATOR") return null;
  const events = await EventModel.find({ weddingId: member.weddingId, archivedAt: null, coordinatorIds: member._id }).select("_id").lean().exec();
  return events.map((event: { _id: Types.ObjectId }) => event._id);
}
async function enrich(tasks: Array<{ _id: Types.ObjectId; title: string; description?: string; eventId?: Types.ObjectId | null; assignedMembershipId?: Types.ObjectId | null; dueDate?: Date | null; priority: string; status: string; completedAt?: Date | null; revision?: number; createdAt: Date; updatedAt: Date }>, weddingId: Types.ObjectId) {
  const eventIds = tasks.flatMap((t) => t.eventId ? [t.eventId] : []);
  const memberIds = tasks.flatMap((t) => t.assignedMembershipId ? [t.assignedMembershipId] : []);
  const [events, members] = await Promise.all([
    EventModel.find({ _id: { $in: eventIds }, weddingId }).select("name archivedAt").lean().exec(),
    WeddingMembershipModel.find({ _id: { $in: memberIds }, weddingId }).select("userId role").lean().exec(),
  ]);
  const users = await UserModel.find({ _id: { $in: members.map((m: { userId: Types.ObjectId }) => m.userId) } }).select("name").lean().exec();
  const userMap = new Map<string, string>(users.map((u: { _id: Types.ObjectId; name: string }) => [u._id.toString(), u.name]));
  const memberMap = new Map<string, { id: string; name: string; role: string }>(members.map((m: { _id: Types.ObjectId; userId: Types.ObjectId; role: string }) => [m._id.toString(), { id: m._id.toString(), name: userMap.get(m.userId.toString()) ?? "Former member", role: m.role }]));
  const eventMap = new Map<string, { id: string; name: string; archivedAt: string | null }>(events.map((e: { _id: Types.ObjectId; name: string; archivedAt?: Date | null }) => [e._id.toString(), { id: e._id.toString(), name: e.name, archivedAt: e.archivedAt?.toISOString() ?? null }]));
  return tasks.map((t) => ({ id: t._id.toString(), title: t.title, description: t.description ?? "", eventId: t.eventId?.toString() ?? null, assignedMembershipId: t.assignedMembershipId?.toString() ?? null, dueDate: t.dueDate?.toISOString() ?? null, priority: t.priority, status: t.status, completedAt: t.completedAt?.toISOString() ?? null, revision: t.revision ?? 0, createdAt: t.createdAt.toISOString(), updatedAt: t.updatedAt.toISOString(), event: t.eventId ? eventMap.get(t.eventId.toString()) ?? null : null, assignee: t.assignedMembershipId ? memberMap.get(t.assignedMembershipId.toString()) ?? null : null }));
}
export async function listTasks(userId: string, query: TaskQuery) {
  const member = await membershipFor(userId);
  const allowed = await visibleEvents(member);
  const filters: Record<string, unknown>[] = [{ weddingId: member.weddingId }];
  if (allowed) filters.push({ eventId: { $in: allowed } });
  if (query.status) filters.push({ status: query.status });
  if (query.priority) filters.push({ priority: query.priority });
  if (query.eventId) filters.push({ eventId: query.eventId === "none" ? null : new Types.ObjectId(query.eventId) });
  if (query.assignedMembershipId) filters.push({ assignedMembershipId: query.assignedMembershipId === "none" ? null : new Types.ObjectId(query.assignedMembershipId) });
  if (query.mine === "true") filters.push({ assignedMembershipId: member._id });
  if (query.q) { const text = query.q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); filters.push({ $or: [{ title: { $regex: text, $options: "i" } }, { description: { $regex: text, $options: "i" } }] }); }
  const filter = { $and: filters };
  const [tasks, total] = await Promise.all([TaskModel.find(filter).sort({ createdAt: -1, _id: -1 }).skip((query.page - 1) * query.limit).limit(query.limit).lean().exec(), TaskModel.countDocuments(filter).exec()]);
  return { data: await enrich(tasks, member.weddingId), pagination: { page: query.page, limit: query.limit, total, totalPages: Math.ceil(total / query.limit) } };
}
export async function getTask(userId: string, taskId: string) {
  const member = await membershipFor(userId);
  if (!Types.ObjectId.isValid(taskId)) throw notFound();
  const allowed = await visibleEvents(member);
  const task = await TaskModel.findOne({ _id: taskId, weddingId: member.weddingId, ...(allowed ? { eventId: { $in: allowed } } : {}) }).lean().exec();
  if (!task) throw notFound();
  return (await enrich([task], member.weddingId))[0];
}
async function validateAssociations(weddingId: Types.ObjectId, input: Partial<TaskInput>, old?: { eventId?: Types.ObjectId | null; assignedMembershipId?: Types.ObjectId | null }) {
  if (input.eventId && input.eventId !== old?.eventId?.toString() && !(await EventModel.exists({ _id: input.eventId, weddingId, archivedAt: null }))) throw new AppError("VALIDATION_ERROR", "Select an active event in this wedding.", 400);
  if (input.assignedMembershipId && input.assignedMembershipId !== old?.assignedMembershipId?.toString() && !(await WeddingMembershipModel.exists({ _id: input.assignedMembershipId, weddingId }))) throw new AppError("VALIDATION_ERROR", "Select a member of this wedding.", 400);
}
export async function createTask(userId: string, input: TaskInput) {
  const member = await membershipFor(userId); requireManager(member.role);
  await validateAssociations(member.weddingId, input);
  const task = await TaskModel.create({ ...input, weddingId: member.weddingId, completedAt: input.status === "COMPLETED" ? new Date() : null });
  return (await enrich([task], member.weddingId))[0];
}
export async function patchTask(userId: string, taskId: string, changes: Partial<TaskInput>, expectedRevision: number) {
  const member = await membershipFor(userId); requireManager(member.role);
  if (!Types.ObjectId.isValid(taskId)) throw notFound();
  const previous = await TaskModel.findOne({ _id: taskId, weddingId: member.weddingId }).lean().exec();
  if (!previous) throw notFound();
  if ((previous.revision ?? 0) !== expectedRevision) throw new AppError("CONFLICT", "This task changed. Close the form and reopen it to review the latest version.", 409);
  await validateAssociations(member.weddingId, changes, previous);
  const completedAt = changes.status === undefined || changes.status === previous.status ? previous.completedAt : changes.status === "COMPLETED" ? new Date() : null;
  // Documents created before revision tracking have no field and are version zero.
  const revisionFilter = expectedRevision === 0 ? { $or: [{ revision: 0 }, { revision: { $exists: false } }] } : { revision: expectedRevision };
  const updated = await TaskModel.findOneAndUpdate({ _id: taskId, weddingId: member.weddingId, ...revisionFilter }, { $set: { ...changes, completedAt }, $inc: { revision: 1 } }, { new: true, runValidators: true }).lean().exec();
  if (!updated) throw new AppError("CONFLICT", "This task changed. Close the form and reopen it to review the latest version.", 409);
  return (await enrich([updated], member.weddingId))[0];
}
export async function deleteTask(userId: string, taskId: string) {
  const member = await membershipFor(userId); requireManager(member.role);
  if (!Types.ObjectId.isValid(taskId)) throw notFound();
  const result = await TaskModel.deleteOne({ _id: taskId, weddingId: member.weddingId }).exec();
  if (!result.deletedCount) throw notFound();
}
