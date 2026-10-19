import { z } from "zod";

export const taskStatuses = ["TODO", "IN_PROGRESS", "COMPLETED"] as const;
export const taskPriorities = ["LOW", "MEDIUM", "HIGH"] as const;
const id = z.string().regex(/^[a-f\d]{24}$/i, "Invalid selection.");
const fields = z.object({
  title: z.string().trim().min(1, "Enter a task title.").max(200),
  description: z.string().trim().max(2000),
  eventId: id.nullable(),
  assignedMembershipId: id.nullable(),
  dueDate: z.iso.datetime({ offset: true }).nullable(),
  priority: z.enum(taskPriorities),
  status: z.enum(taskStatuses),
}).strict();
export const taskSchema = fields.extend({ description: fields.shape.description.default(""), eventId: fields.shape.eventId.default(null), assignedMembershipId: fields.shape.assignedMembershipId.default(null), dueDate: fields.shape.dueDate.default(null), priority: fields.shape.priority.default("MEDIUM"), status: fields.shape.status.default("TODO") });
export const taskPatchSchema = fields.partial().extend({ expectedRevision: z.number().int().min(0).max(Number.MAX_SAFE_INTEGER) }).refine((value) => Object.keys(value).some((key) => key !== "expectedRevision"), "Provide a change.");
const filterId = z.union([id, z.literal("none")]);
export const taskQuerySchema = z.object({
  page: z.coerce.number().int().min(1).max(100000).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: z.enum(taskStatuses).optional(),
  priority: z.enum(taskPriorities).optional(),
  eventId: filterId.optional(),
  assignedMembershipId: filterId.optional(),
  mine: z.enum(["true", "false"]).optional(),
  q: z.string().trim().max(100).optional(),
}).strict();
export type TaskInput = z.output<typeof taskSchema>;
export type TaskQuery = z.output<typeof taskQuerySchema>;
