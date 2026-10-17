import { UserModel } from "@/modules/auth/models/user.model";
import { WeddingModel } from "@/modules/weddings/models/wedding.model";
import { createOpaqueToken } from "@/server/auth/tokens";
import { connectToDatabase } from "@/server/db/mongoose";
import { memberInvitationConfiguration, sendMemberInvitation } from "@/server/email/member-invitation";
import { AppError } from "@/shared/errors/app-error";
import { type MemberRole } from "@/shared/auth/member-roles";
import { hashMemberInvitationToken } from "./invitation-token";
import { MemberInvitationModel } from "./models/member-invitation.model";
import { WeddingMembershipModel } from "./models/wedding-membership.model";
import { invitationTokenSchema, inviteMemberSchema } from "./schemas";

const duration = 7 * 24 * 60 * 60 * 1000;
const unavailable = () => new AppError("NOT_FOUND", "This invitation is invalid, expired, or no longer available.", 404);

function tokenHash(token: string) {
  if (!invitationTokenSchema.safeParse(token).success) throw unavailable();
  return hashMemberInvitationToken(token);
}

export async function inviteMember(userId: string, email: string, role: MemberRole) {
  role = inviteMemberSchema.shape.role.parse(role);
  await connectToDatabase();
  await MemberInvitationModel.init();
  const admin = await WeddingMembershipModel.findOne({ userId, role: "ADMIN" }).exec();
  if (!admin) throw new AppError("FORBIDDEN", "Only a wedding admin can invite members.", 403);
  const wedding = await WeddingModel.findOne({ _id: admin.weddingId, deletedAt: null }).exec();
  if (!wedding) throw new AppError("FORBIDDEN", "Wedding space is unavailable.", 403);
  const emailNormalized = email.trim().toLowerCase();
  const invitedUser = await UserModel.findOne({ emailNormalized }).exec();
  if (invitedUser && await WeddingMembershipModel.exists({ userId: invitedUser._id, weddingId: admin.weddingId })) {
    throw new AppError("CONFLICT", "This person is already a member of your wedding.", 409);
  }
  memberInvitationConfiguration();
  const token = createOpaqueToken();
  const hash = tokenHash(token);
  const now = new Date();
  await MemberInvitationModel.updateMany({ weddingId: admin.weddingId, emailNormalized, status: "PENDING", expiresAt: { $lte: now } }, { $set: { status: "REVOKED" } });
  let invitation;
  try {
    invitation = await MemberInvitationModel.create({ weddingId: admin.weddingId, emailNormalized, role, tokenHash: hash, status: "PENDING", invitedByUserId: userId, expiresAt: new Date(now.getTime() + duration) });
  } catch (error) {
    if (typeof error === "object" && error !== null && "code" in error && error.code === 11000) {
      throw new AppError("CONFLICT", "An invitation is already pending for this email.", 409);
    }
    throw error;
  }
  try {
    await sendMemberInvitation(emailNormalized, token);
  } catch (error) {
    await MemberInvitationModel.updateOne({ _id: invitation._id, status: "PENDING" }, { $set: { status: "REVOKED" } });
    throw error;
  }
  return { id: invitation._id.toString(), email: emailNormalized, role, status: "PENDING", expiresAt: invitation.expiresAt };
}

export async function getMemberInvitation(token: string) {
  const hash = tokenHash(token);
  await connectToDatabase();
  const invitation = await MemberInvitationModel.findOne({ tokenHash: hash, status: "PENDING", expiresAt: { $gt: new Date() } }).exec();
  if (!invitation) throw unavailable();
  const wedding = await WeddingModel.findOne({ _id: invitation.weddingId, deletedAt: null }).select("brideName groomName weddingDate").exec();
  if (!wedding) throw unavailable();
  return { email: invitation.emailNormalized, role: invitation.role, wedding: { brideName: wedding.brideName, groomName: wedding.groomName, weddingDate: wedding.weddingDate }, requiresLogin: true };
}

export async function acceptMemberInvitation(token: string, user: { id: string; email: string }) {
  const hash = tokenHash(token);
  const connection = await connectToDatabase();
  await Promise.all([MemberInvitationModel.init(), WeddingMembershipModel.init()]);
  const session = await connection.startSession();
  try {
    let weddingId = "";
    let acceptedRole: MemberRole | undefined;
    await session.withTransaction(async () => {
      const invitation = await MemberInvitationModel.findOne({ tokenHash: hash, status: "PENDING", expiresAt: { $gt: new Date() } }).session(session).exec();
      if (!invitation) throw unavailable();
      if (invitation.emailNormalized !== user.email.trim().toLowerCase()) throw new AppError("FORBIDDEN", "Sign in with the email address that received this invitation.", 403);
      if (await WeddingMembershipModel.exists({ userId: user.id }).session(session)) throw new AppError("ALREADY_HAS_WEDDING", "Your account already belongs to a wedding space.", 409);
      if (!(await WeddingModel.exists({ _id: invitation.weddingId, deletedAt: null }).session(session))) throw unavailable();
      const role = inviteMemberSchema.shape.role.safeParse(invitation.role);
      if (!role.success) throw unavailable();
      await WeddingMembershipModel.create([{ userId: user.id, weddingId: invitation.weddingId, role: role.data }], { session });
      const result = await MemberInvitationModel.updateOne({ _id: invitation._id, status: "PENDING", expiresAt: { $gt: new Date() } }, { $set: { status: "ACCEPTED", acceptedByUserId: user.id, acceptedAt: new Date() } }, { session });
      if (result.modifiedCount !== 1) throw unavailable();
      weddingId = invitation.weddingId.toString();
      acceptedRole = role.data;
    });
    return { weddingId, role: acceptedRole };
  } catch (error) {
    if (typeof error === "object" && error !== null && "code" in error && error.code === 11000) throw new AppError("ALREADY_HAS_WEDDING", "Your account already belongs to a wedding space.", 409);
    throw error;
  } finally {
    await session.endSession();
  }
}
