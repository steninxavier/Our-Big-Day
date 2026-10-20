import { beforeEach, describe, expect, it, vi } from "vitest";
import { Types } from "mongoose";
import { expensePatchSchema, expenseQuerySchema, expenseSchema } from "@/modules/expenses/schemas";
const mocks = vi.hoisted(() => ({ member: vi.fn(), wedding: vi.fn(), event: vi.fn(), eventFind: vi.fn(), find: vi.fn(), findOne: vi.fn(), count: vi.fn(), aggregate: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn() }));
vi.mock("@/server/db/mongoose", () => ({ connectToDatabase: vi.fn() }));
vi.mock("@/modules/members/models/wedding-membership.model", () => ({ WeddingMembershipModel: { findOne: mocks.member } }));
vi.mock("@/modules/weddings/models/wedding.model", () => ({ WeddingModel: { exists: mocks.wedding } }));
vi.mock("@/modules/events/models/event.model", () => ({ EventModel: { exists: mocks.event, find: mocks.eventFind } }));
vi.mock("@/modules/expenses/models/expense.model", () => ({ ExpenseModel: { find: mocks.find, findOne: mocks.findOne, countDocuments: mocks.count, aggregate: mocks.aggregate, create: mocks.create, findOneAndUpdate: mocks.update, deleteOne: mocks.delete } }));
import { createExpense, deleteExpense, expenseSummary, getExpense, listExpenseEvents, listExpenses, patchExpense } from "@/modules/expenses/expense.service";
const input = { title: " Venue ", amountPaise: 1050, expenseDate: "2026-10-19", category: "VENUE" };
describe("expense validation", () => {
  it("normalizes input and defaults optional fields", () => { expect(expenseSchema.parse(input)).toMatchObject({ title: "Venue", amountPaise: 1050, currency: "INR", eventId: null, notes: "" }); });
  it("rejects invalid amounts, dates, unknown fields, tenant IDs and reversed filters", () => {
    expect(expenseSchema.safeParse({ ...input, amountPaise: 1.5 }).success).toBe(false);
    expect(expenseSchema.safeParse({ ...input, expenseDate: "2026-02-30" }).success).toBe(false);
    expect(expenseSchema.safeParse({ ...input, weddingId: new Types.ObjectId().toString() }).success).toBe(false);
    expect(expensePatchSchema.safeParse({ expectedRevision: 0 }).success).toBe(false);
    expect(expenseQuerySchema.safeParse({ from: "2026-10-20", to: "2026-10-19" }).success).toBe(false);
  });
});
describe("expense access and concurrency", () => {
  const weddingId = new Types.ObjectId(); const expenseId = new Types.ObjectId().toString(); const eventId = new Types.ObjectId().toString();
  function role(value: string) { mocks.member.mockReturnValue({ lean: () => ({ exec: async () => ({ weddingId, role: value }) }) }); }
  beforeEach(() => { vi.clearAllMocks(); role("ADMIN"); mocks.wedding.mockResolvedValue(true); mocks.event.mockResolvedValue(null); mocks.findOne.mockReturnValue({ lean: () => ({ exec: async () => null }) }); });
  it("rejects coordinators before any expense read or mutation", async () => {
    role("EVENT_COORDINATOR");
    for (const action of [() => listExpenses("user", { page: 1, limit: 20 }), () => listExpenseEvents("user"), () => expenseSummary("user"), () => getExpense("user", expenseId), () => createExpense("user", expenseSchema.parse(input)), () => patchExpense("user", expenseId, { title: "New" }, 0), () => deleteExpense("user", expenseId)]) await expect(action()).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(mocks.find).not.toHaveBeenCalled(); expect(mocks.create).not.toHaveBeenCalled(); expect(mocks.aggregate).not.toHaveBeenCalled();
  });
  it("includes named archived events only from the caller's wedding", async () => {
    const archivedId = new Types.ObjectId();
    mocks.eventFind.mockReturnValue({ select: () => ({ sort: () => ({ lean: () => ({ exec: async () => [{ _id: archivedId, name: "Ceremony", archivedAt: new Date() }] }) }) }) });
    await expect(listExpenseEvents("user")).resolves.toEqual([{ id: archivedId.toString(), name: "Ceremony", archived: true }]);
    expect(mocks.eventFind).toHaveBeenCalledWith({ weddingId });
  });
  it("scopes direct lookups and rejects events from another wedding", async () => {
    await expect(getExpense("user", expenseId)).rejects.toMatchObject({ code: "NOT_FOUND" }); expect(mocks.findOne).toHaveBeenCalledWith({ _id: expenseId, weddingId });
    await expect(createExpense("user", expenseSchema.parse({ ...input, eventId }))).rejects.toMatchObject({ code: "VALIDATION_ERROR" }); expect(mocks.event).toHaveBeenCalledWith({ _id: eventId, weddingId, archivedAt: null });
  });
  it("rejects stale edits using an atomic revision guard", async () => {
    role("MANAGER"); mocks.findOne.mockReturnValue({ lean: () => ({ exec: async () => ({ revision: 2, eventId: null }) }) });
    await expect(patchExpense("user", expenseId, { title: "Changed" }, 1)).rejects.toMatchObject({ code: "CONFLICT" });
    mocks.update.mockReturnValue({ lean: () => ({ exec: async () => null }) });
    await expect(patchExpense("user", expenseId, { title: "Changed" }, 2)).rejects.toMatchObject({ code: "CONFLICT" });
    expect(mocks.update).toHaveBeenCalledWith({ _id: expenseId, weddingId, revision: 2 }, { $set: { title: "Changed" }, $inc: { revision: 1 } }, expect.any(Object));
  });
  it("allows retaining an archived event but rejects adding a different archived event", async () => {
    const retained = new Types.ObjectId();
    mocks.findOne.mockReturnValue({ lean: () => ({ exec: async () => ({ revision: 1, eventId: retained }) }) });
    mocks.update.mockReturnValue({ lean: () => ({ exec: async () => null }) });
    await expect(patchExpense("user", expenseId, { eventId: retained.toString() }, 1)).rejects.toMatchObject({ code: "CONFLICT" });
    expect(mocks.event).not.toHaveBeenCalled();
    await expect(patchExpense("user", expenseId, { eventId }, 1)).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
    expect(mocks.event).toHaveBeenCalledWith({ _id: eventId, weddingId, archivedAt: null });
  });
});
