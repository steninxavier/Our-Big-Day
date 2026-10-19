import { beforeEach, describe, expect, it, vi } from "vitest";
import { Types } from "mongoose";

const mocks = vi.hoisted(() => ({ member: vi.fn(), wedding: vi.fn(), eventFind: vi.fn(), eventExists: vi.fn(), memberFind: vi.fn(), memberExists: vi.fn(), userFind: vi.fn(), taskFind: vi.fn(), taskFindOne: vi.fn(), count: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn() }));
vi.mock("@/server/db/mongoose", () => ({ connectToDatabase: vi.fn() }));
vi.mock("@/modules/members/models/wedding-membership.model", () => ({ WeddingMembershipModel: { findOne: mocks.member, find: mocks.memberFind, exists: mocks.memberExists } }));
vi.mock("@/modules/weddings/models/wedding.model", () => ({ WeddingModel: { exists: mocks.wedding } }));
vi.mock("@/modules/events/models/event.model", () => ({ EventModel: { find: mocks.eventFind, exists: mocks.eventExists } }));
vi.mock("@/modules/auth/models/user.model", () => ({ UserModel: { find: mocks.userFind } }));
vi.mock("@/modules/tasks/models/task.model", () => ({ TaskModel: { find: mocks.taskFind, findOne: mocks.taskFindOne, countDocuments: mocks.count, create: mocks.create, findOneAndUpdate: mocks.update, deleteOne: mocks.delete } }));
import { createTask, deleteTask, getTask, listTasks, patchTask } from "@/modules/tasks/task.service";
import { taskSchema } from "@/modules/tasks/schemas";

describe("task authorization", () => {
  const weddingId = new Types.ObjectId();
  const memberId = new Types.ObjectId();
  const eventId = new Types.ObjectId();
  const member = { _id: memberId, weddingId, role: "EVENT_COORDINATOR" };
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.member.mockReturnValue({ lean: () => ({ exec: async () => member }) });
    mocks.wedding.mockResolvedValue(true);
    mocks.eventFind.mockReturnValue({ select: () => ({ lean: () => ({ exec: async () => [ { _id: eventId } ] }) }) });
    mocks.memberFind.mockReturnValue({ select: () => ({ lean: () => ({ exec: async () => [] }) }) });
    mocks.userFind.mockReturnValue({ select: () => ({ lean: () => ({ exec: async () => [] }) }) });
    mocks.taskFind.mockReturnValue({ sort: () => ({ skip: () => ({ limit: () => ({ lean: () => ({ exec: async () => [] }) }) }) }) });
    mocks.taskFindOne.mockReturnValue({ lean: () => ({ exec: async () => null }) });
    mocks.count.mockReturnValue({ exec: async () => 0 });
  });
  it("scopes lists and direct task reads to active assigned events in the current wedding", async () => {
    await listTasks("user", { page: 1, limit: 20 });
    expect(mocks.eventFind).toHaveBeenCalledWith({ weddingId, archivedAt: null, coordinatorIds: memberId });
    expect(mocks.taskFind).toHaveBeenCalledWith({ $and: [{ weddingId }, { eventId: { $in: [eventId] } }] });
    await expect(getTask("user", new Types.ObjectId().toString())).rejects.toMatchObject({ code: "NOT_FOUND" });
    expect(mocks.taskFindOne).toHaveBeenCalledWith(expect.objectContaining({ weddingId, eventId: { $in: [eventId] } }));
  });
  it("rejects all coordinator writes, including status changes", async () => {
    await expect(createTask("user", taskSchema.parse({ title: "Prepare" }))).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(patchTask("user", new Types.ObjectId().toString(), { status: "COMPLETED" }, 0)).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(deleteTask("user", new Types.ObjectId().toString())).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(mocks.create).not.toHaveBeenCalled(); expect(mocks.update).not.toHaveBeenCalled(); expect(mocks.delete).not.toHaveBeenCalled();
  });
  it("rejects an event outside the authenticated wedding", async () => {
    mocks.member.mockReturnValue({ lean: () => ({ exec: async () => ({ ...member, role: "ADMIN" }) }) });
    mocks.eventExists.mockResolvedValue(null);
    await expect(createTask("user", taskSchema.parse({ title: "Prepare", eventId: eventId.toString() }))).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
    expect(mocks.eventExists).toHaveBeenCalledWith({ _id: eventId.toString(), weddingId, archivedAt: null });
    expect(mocks.create).not.toHaveBeenCalled();
  });
  it("rejects a stale editor revision before it can overwrite a newer status", async () => {
    mocks.member.mockReturnValue({ lean: () => ({ exec: async () => ({ ...member, role: "MANAGER" }) }) });
    mocks.taskFindOne.mockReturnValue({ lean: () => ({ exec: async () => ({ revision: 2, status: "COMPLETED" }) }) });
    await expect(patchTask("user", new Types.ObjectId().toString(), { title: "Old draft", status: "TODO" }, 1)).rejects.toMatchObject({ code: "CONFLICT", status: 409 });
    expect(mocks.update).not.toHaveBeenCalled();
  });
  it("atomically checks and increments the version, including legacy version-zero tasks", async () => {
    mocks.member.mockReturnValue({ lean: () => ({ exec: async () => ({ ...member, role: "ADMIN" }) }) });
    mocks.taskFindOne.mockReturnValue({ lean: () => ({ exec: async () => ({ status: "TODO", completedAt: null }) }) });
    mocks.update.mockReturnValue({ lean: () => ({ exec: async () => null }) });
    const taskId = new Types.ObjectId().toString();
    await expect(patchTask("user", taskId, { title: "Updated" }, 0)).rejects.toMatchObject({ code: "CONFLICT" });
    expect(mocks.update).toHaveBeenCalledWith({ _id: taskId, weddingId, $or: [{ revision: 0 }, { revision: { $exists: false } }] }, { $set: { title: "Updated", completedAt: null }, $inc: { revision: 1 } }, expect.any(Object));
  });
  it("preserves completion data and returns the incremented revision on a successful edit", async () => {
    mocks.member.mockReturnValue({ lean: () => ({ exec: async () => ({ ...member, role: "MANAGER" }) }) });
    const completedAt = new Date("2030-01-01T00:00:00Z");
    const taskId = new Types.ObjectId();
    mocks.taskFindOne.mockReturnValue({ lean: () => ({ exec: async () => ({ revision: 3, status: "COMPLETED", completedAt }) }) });
    mocks.update.mockReturnValue({ lean: () => ({ exec: async () => ({ _id: taskId, title: "Updated", priority: "HIGH", status: "COMPLETED", completedAt, revision: 4, createdAt: completedAt, updatedAt: completedAt }) }) });
    const updated = await patchTask("user", taskId.toString(), { title: "Updated" }, 3);
    expect(mocks.update).toHaveBeenCalledWith({ _id: taskId.toString(), weddingId, revision: 3 }, { $set: { title: "Updated", completedAt }, $inc: { revision: 1 } }, expect.any(Object));
    expect(updated).toMatchObject({ title: "Updated", status: "COMPLETED", revision: 4, completedAt: completedAt.toISOString() });
  });
});
