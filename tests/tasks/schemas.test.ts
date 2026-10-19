import { describe, expect, it } from "vitest";
import { taskPatchSchema, taskQuerySchema, taskSchema } from "@/modules/tasks/schemas";

describe("task validation", () => {
  it("provides defaults and trims titles", () => { expect(taskSchema.parse({ title: "  Confirm venue  " })).toMatchObject({ title: "Confirm venue", priority: "MEDIUM", status: "TODO", eventId: null }); });
  it("rejects empty titles, extra tenant fields, invalid dates, and empty patches", () => {
    expect(taskSchema.safeParse({ title: "  " }).success).toBe(false);
    expect(taskSchema.safeParse({ title: "A", weddingId: "other" }).success).toBe(false);
    expect(taskSchema.safeParse({ title: "A", dueDate: "not a date" }).success).toBe(false);
    expect(taskPatchSchema.safeParse({}).success).toBe(false);
    expect(taskPatchSchema.safeParse({ status: "COMPLETED" }).success).toBe(false);
    expect(taskPatchSchema.safeParse({ expectedRevision: 0 }).success).toBe(false);
    expect(taskPatchSchema.safeParse({ expectedRevision: -1, status: "TODO" }).success).toBe(false);
    expect(taskPatchSchema.parse({ expectedRevision: 2, status: "COMPLETED" })).toEqual({ expectedRevision: 2, status: "COMPLETED" });
  });
  it("validates filters and pagination", () => {
    expect(taskQuerySchema.parse({ mine: "true", page: "2", eventId: "none" })).toMatchObject({ page: 2, limit: 20 });
    expect(taskQuerySchema.safeParse({ limit: "101" }).success).toBe(false);
    expect(taskQuerySchema.safeParse({ mine: "yes" }).success).toBe(false);
  });
});
