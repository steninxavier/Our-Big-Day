import { Schema, Types, model, models } from "mongoose";

export type Session = {
  userId: Types.ObjectId;
  tokenHash: string;
  expiresAt: Date;
  lastUsedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
};

const sessionSchema = new Schema<Session>(
  {
    userId: { type: Schema.Types.ObjectId, required: true, ref: "User", index: true },
    tokenHash: { type: String, required: true, unique: true },
    expiresAt: { type: Date, required: true, index: { expires: 0 } },
    lastUsedAt: { type: Date },
  },
  { collection: "sessions", timestamps: true },
);

export const SessionModel = models.Session || model<Session>("Session", sessionSchema);
