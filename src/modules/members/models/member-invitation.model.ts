import { Schema, Types, model, models } from "mongoose";
import { MEMBER_ROLES, type MemberRole } from "@/shared/auth/member-roles";

export type MemberInvitation = {
  weddingId: Types.ObjectId;
  emailNormalized: string;
  role: MemberRole;
  tokenHash: string;
  status: "PENDING" | "ACCEPTED" | "REVOKED";
  invitedByUserId: Types.ObjectId;
  acceptedByUserId?: Types.ObjectId;
  acceptedAt?: Date;
  expiresAt: Date;
};

const schema = new Schema<MemberInvitation>(
  {
    weddingId: { type: Schema.Types.ObjectId, required: true },
    emailNormalized: { type: String, required: true, maxlength: 254 },
    role: { type: String, required: true, enum: MEMBER_ROLES },
    tokenHash: { type: String, required: true, unique: true, select: false },
    status: { type: String, required: true, enum: ["PENDING", "ACCEPTED", "REVOKED"] },
    invitedByUserId: { type: Schema.Types.ObjectId, required: true },
    acceptedByUserId: { type: Schema.Types.ObjectId },
    acceptedAt: Date,
    expiresAt: { type: Date, required: true },
  },
  { collection: "wedding_member_invitations", timestamps: true },
);

schema.index({ weddingId: 1, emailNormalized: 1 }, { unique: true, partialFilterExpression: { status: "PENDING" } });
schema.index({ weddingId: 1, status: 1 });

export const MemberInvitationModel = models.MemberInvitation || model<MemberInvitation>("MemberInvitation", schema);
