import { Schema, Types, model, models } from "mongoose";
import { expenseCategories } from "../schemas";

export type WeddingExpense = { weddingId: Types.ObjectId; title: string; amountPaise: number; currency: "INR"; expenseDate: Date; category: typeof expenseCategories[number]; eventId: Types.ObjectId | null; vendorId: Types.ObjectId | null; notes: string; createdByMembershipId: Types.ObjectId; revision: number; createdAt: Date; updatedAt: Date };
const schema = new Schema<WeddingExpense>({
  weddingId: { type: Schema.Types.ObjectId, required: true }, title: { type: String, required: true, maxlength: 120 },
  amountPaise: { type: Number, required: true, min: 1, max: 100000000000, validate: Number.isSafeInteger }, currency: { type: String, enum: ["INR"], default: "INR" },
  expenseDate: { type: Date, required: true }, category: { type: String, enum: expenseCategories, required: true },
  eventId: { type: Schema.Types.ObjectId, default: null }, vendorId: { type: Schema.Types.ObjectId, default: null }, notes: { type: String, default: "", maxlength: 2000 },
  createdByMembershipId: { type: Schema.Types.ObjectId, required: true }, revision: { type: Number, default: 0, min: 0 },
}, { collection: "expenses", timestamps: true });
schema.index({ weddingId: 1, expenseDate: -1, _id: -1 });
schema.index({ weddingId: 1, category: 1 });
schema.index({ weddingId: 1, eventId: 1 });
schema.index({ weddingId: 1, vendorId: 1 });
export const ExpenseModel = models.Expense || model<WeddingExpense>("Expense", schema);
