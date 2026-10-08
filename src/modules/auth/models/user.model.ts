import { Schema, model, models } from "mongoose";

export type User = {
  name: string;
  email: string;
  emailNormalized: string;
  passwordHash: string;
  createdAt: Date;
  updatedAt: Date;
};

const userSchema = new Schema<User>(
  {
    name: { type: String, required: true, trim: true, maxlength: 120 },
    email: { type: String, required: true, trim: true, maxlength: 254 },
    emailNormalized: { type: String, required: true, unique: true, index: true },
    passwordHash: { type: String, required: true, select: false },
  },
  { collection: "users", timestamps: true },
);

export const UserModel = models.User || model<User>("User", userSchema);
