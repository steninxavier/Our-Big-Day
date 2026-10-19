import { Schema, Types, model, models } from "mongoose";
import { guestStatuses } from "../schemas";

export type WeddingGuest = {
  weddingId: Types.ObjectId; name: string; email: string; phone: string; notes: string;
  maxGuests: number; invitedEventIds: Types.ObjectId[]; rsvpStatus: typeof guestStatuses[number];
  numberAttending: number | null; invitationSentAt: Date | null; lastReminderSentAt?: Date | null; reminderCount?: number;
  emailSendLockId?: string; emailSendLockExpiresAt?: Date | null; invitationToken?: string; rsvpUpdatedAt?: Date | null; revision: number; createdAt: Date; updatedAt: Date;
};
const schema = new Schema<WeddingGuest>({
  weddingId: { type: Schema.Types.ObjectId, required: true }, name: { type: String, required: true, maxlength: 120 },
  email: { type: String, default: "", maxlength: 254 }, phone: { type: String, default: "", maxlength: 40 }, notes: { type: String, default: "", maxlength: 2000 },
  maxGuests: { type: Number, default: 1, min: 1, max: 10000 }, invitedEventIds: [{ type: Schema.Types.ObjectId }],
  rsvpStatus: { type: String, enum: guestStatuses, default: "PENDING" }, numberAttending: { type: Number, default: null },
  invitationSentAt: { type: Date, default: null }, lastReminderSentAt: { type: Date, default: null },
  reminderCount: { type: Number, default: 0, min: 0 },
  emailSendLockId: { type: String, select: false }, emailSendLockExpiresAt: { type: Date, default: null, select: false },
  revision: { type: Number, default: 0, min: 0 },
  invitationToken: { type: String, select: false }, rsvpUpdatedAt: { type: Date, default: null },
}, { collection: "guests", timestamps: true });
schema.index({ weddingId: 1, name: 1, _id: 1 });
schema.index({ weddingId: 1, rsvpStatus: 1 });
schema.index({ weddingId: 1, invitedEventIds: 1 });
schema.index({ invitationToken: 1 }, { unique: true, partialFilterExpression: { invitationToken: { $type: "string" } } });
export const GuestModel = models.Guest || model<WeddingGuest>("Guest", schema);
