import { Schema, Types, model, models } from "mongoose";
import { MEMBER_ROLES, type MemberRole } from "@/shared/auth/member-roles";

export type WeddingMembership = {
  userId: Types.ObjectId;
  weddingId: Types.ObjectId;
  role: MemberRole;
  joinedAt: Date;
  createdAt: Date;
  updatedAt: Date;
};

const weddingMembershipSchema = new Schema<WeddingMembership>(
  {
    userId: { type: Schema.Types.ObjectId, required: true, unique: true, ref: "User" },
    weddingId: { type: Schema.Types.ObjectId, required: true, ref: "Wedding" },
    role: { type: String, required: true, enum: MEMBER_ROLES },
    joinedAt: { type: Date, required: true, default: Date.now },
  },
  { collection: "wedding_memberships", timestamps: true },
);

weddingMembershipSchema.index({ weddingId: 1, userId: 1 }, { unique: true });
weddingMembershipSchema.index({ weddingId: 1, role: 1 });

export const WeddingMembershipModel =
  models.WeddingMembership || model<WeddingMembership>("WeddingMembership", weddingMembershipSchema);
