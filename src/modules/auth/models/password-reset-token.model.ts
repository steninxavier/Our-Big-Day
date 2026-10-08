import { Schema, Types, model, models } from "mongoose";

export type PasswordResetToken = {
  userId: Types.ObjectId;
  tokenHash: string;
  expiresAt: Date;
  usedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
};

const passwordResetTokenSchema = new Schema<PasswordResetToken>(
  {
    userId: { type: Schema.Types.ObjectId, required: true, ref: "User", index: true },
    tokenHash: { type: String, required: true, unique: true },
    expiresAt: { type: Date, required: true, index: { expires: 0 } },
    usedAt: { type: Date },
  },
  { collection: "password_reset_tokens", timestamps: true },
);

export const PasswordResetTokenModel =
  models.PasswordResetToken || model<PasswordResetToken>("PasswordResetToken", passwordResetTokenSchema);
