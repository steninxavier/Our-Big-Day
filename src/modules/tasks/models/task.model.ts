import { Schema, Types, model, models } from "mongoose";
import { taskPriorities, taskStatuses } from "../schemas";

export type WeddingTask = {
  weddingId: Types.ObjectId; title: string; description: string;
  assignedMembershipId: Types.ObjectId | null; eventId: Types.ObjectId | null;
  dueDate: Date | null; priority: (typeof taskPriorities)[number];
  status: (typeof taskStatuses)[number]; completedAt: Date | null; revision: number;
  createdAt: Date; updatedAt: Date;
};
const schema = new Schema<WeddingTask>({
  weddingId: { type: Schema.Types.ObjectId, required: true },
  title: { type: String, required: true, maxlength: 200 },
  description: { type: String, default: "", maxlength: 2000 },
  assignedMembershipId: { type: Schema.Types.ObjectId, default: null },
  eventId: { type: Schema.Types.ObjectId, default: null },
  dueDate: { type: Date, default: null },
  priority: { type: String, enum: taskPriorities, default: "MEDIUM" },
  status: { type: String, enum: taskStatuses, default: "TODO" },
  completedAt: { type: Date, default: null },
  revision: { type: Number, required: true, default: 0, min: 0 },
}, { collection: "tasks", timestamps: true });
schema.index({ weddingId: 1, status: 1 });
schema.index({ weddingId: 1, dueDate: 1 });
schema.index({ weddingId: 1, assignedMembershipId: 1, status: 1 });
schema.index({ weddingId: 1, eventId: 1 });
export const TaskModel = models.Task || model<WeddingTask>("Task", schema);
