import { Schema, Types, model, models } from "mongoose";
import { eventTypes } from "../schemas";

export type WeddingEvent = {
  weddingId: Types.ObjectId; name: string; type?: string; startsAt: Date; endsAt?: Date | null;
  venueName?: string; address?: string; description?: string; dressCode?: string;
  coordinatorIds: Types.ObjectId[]; archivedAt?: Date | null; createdAt: Date; updatedAt: Date;
};

const eventSchema = new Schema<WeddingEvent>({
  weddingId: { type: Schema.Types.ObjectId, required: true },
  name: { type: String, required: true }, type: { type: String, enum: eventTypes },
  startsAt: { type: Date, required: true }, endsAt: { type: Date, default: null },
  venueName: String, address: String, description: String, dressCode: String,
  coordinatorIds: [{ type: Schema.Types.ObjectId, ref: "WeddingMembership" }],
  archivedAt: { type: Date, default: null },
}, { collection: "events", timestamps: true });
eventSchema.index({ weddingId: 1, startsAt: 1 });
eventSchema.index({ weddingId: 1, archivedAt: 1 });
export const EventModel = models.Event || model<WeddingEvent>("Event", eventSchema);
